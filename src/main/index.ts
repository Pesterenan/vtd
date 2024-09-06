import ffmpeg from 'fluent-ffmpeg';
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import fs from 'fs';

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function createFrameExtractorWindow(): void {
  // Create the browser window.
  const modalWindow = new BrowserWindow({
    width: 800,
    height: 400,
    parent: BrowserWindow.getFocusedWindow()!,
    modal: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: join(__dirname, '../preload/index.js')
    }
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    modalWindow.loadURL(
      `${process.env['ELECTRON_RENDERER_URL']}/modals/videoFrameExtractor/video-frame-extractor.html`
    );
  } else {
    modalWindow.loadFile(
      join(__dirname, '../renderer/modals/videoFrameExtractor/video-frame-extractor.html')
    );
  }
  modalWindow.once('ready-to-show', () => {
    modalWindow.show();
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  // Load video into vtd
  ipcMain.on('load-video', async (event) => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Arquivos de Video', extensions: ['mkv', 'mpg', 'mpeg', 'avi', 'mov'] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ]
    });
    if (filePaths.length > 0) {
      const filePath = filePaths[0];
      if (!fs.existsSync(filePath)) {
        throw new Error('Arquivo não encontrado');
      }
      const SCALE_FACTOR = 2;
      let width = 320;
      let height = 240;
      const videoInfo = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            reject(err);
          }
          const duration = metadata.format.duration;
          width = metadata.streams[0].width / SCALE_FACTOR;
          height = metadata.streams[0].height / SCALE_FACTOR;
          const frameRate = metadata.streams[0].r_frame_rate;
          console.log(`Duração: ${duration} segundos`);
          console.log(`Resolução: ${width}x${height}`);
          console.log(`Taxa de quadros: ${frameRate}`);
          ffmpeg(filePath).screenshots({
            count: 5,
            folder: './temp',
            size: `${width}x${height}`
          });
          resolve(metadata);
        });
      });
      event.reply('load-video-response', { success: true, data: videoInfo });
    }
  });

  // Open Video Extractor Window
  ipcMain.on('frame-extractor-window', () => {
    console.log('abrindo janela');
    createFrameExtractorWindow();
    console.log('janela abrida');
  });

  // Process video frame
  ipcMain.on('process-video-frame', async (event, filePath, timeInSeconds) => {
    console.log('Starting video frame process', filePath, timeInSeconds);

    const chunks: Uint8Array[] = [];
    const videoFrame = await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .seekInput(timeInSeconds)
        .frames(1)
        .outputOptions('-f', 'image2pipe')
        .outputOptions('-vcodec', 'png')
        .pipe()
        .on('data', (chunk) => {
          chunks.push(chunk);
        })
        .on('end', () => {
          console.log('Frame processed');
          const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const combined = new Uint8Array(totalSize);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          resolve(combined);
        })
        .on('error', (err) => {
          event.reply('process-video-frame-response', {
            success: false,
            message: 'Error processing frame.'
          });
          reject(err);
        });
    });

    event.reply('process-video-frame-response', { success: true, data: videoFrame });
  });

  // Load images into vtd
  ipcMain.on('load-image', async (event) => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Arquivos de Imagem', extensions: ['jpg', 'jpeg', 'png', 'svg', 'bmp'] },
        { name: 'Arquivos Bitmap', extensions: ['bmp'] },
        { name: 'Arquivos JPG', extensions: ['jpg, jpeg'] },
        { name: 'Arquivos PNG', extensions: ['png'] },
        { name: 'Arquivos SVG', extensions: ['svg'] },
        { name: 'Todos os Arquivos', extensions: ['*'] }
      ]
    });
    if (filePaths.length > 0) {
      const filePath = filePaths[0];
      const extension = filePath.split('.').pop()?.toLowerCase();
      console.log(extension);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fs.readFile(filePaths[0], (err: any, data: any) => {
        if (err) {
          console.log(err);
          event.reply('load-image-response', { success: false, message: 'Failed to load file' });
          return;
        }
        const base64 = Buffer.from(data).toString('base64');
        if (extension === 'svg') {
          const base64Data = `data:image/svg+xml;base64,${base64}`;
          event.reply('load-image-response', { success: true, data: base64Data });
        } else {
          const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
          const base64Data = `data:${mimeType};base64,${base64}`;
          event.reply('load-image-response', { success: true, data: base64Data });
        }
      });
    }
  });

  // Save Project onto file
  ipcMain.on('save-project', async (event, { dataString }: { dataString: string }) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Salvar Projeto',
      defaultPath: 'projeto.json',
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (filePath) {
      fs.writeFile(filePath, dataString, (err) => {
        if (err) {
          event.reply('save-project-response', { success: false, message: 'Failed to save file' });
          return;
        }
        event.reply('save-project-response', { success: true, message: 'File saved successfully' });
      });
    }
  });

  // Load Project from file
  ipcMain.on('load-project', async (event) => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (filePaths.length > 0) {
      fs.readFile(filePaths[0], 'utf-8', (err, data: string) => {
        if (err) {
          event.reply('load-project-response', { success: false, message: 'Failed to load file' });
          return;
        }
        event.reply('load-project-response', { success: true, data });
      });
    } else {
      event.reply('load-project-response', { success: false, message: 'No file selected' });
    }
  });
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
