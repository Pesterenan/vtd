import { electronApp, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import type { IVideoMetadata } from "src/types";
import fs from "fs";
import { getMetadata, processVideoFrame } from "./utils/videoUtils";

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const VIDEO_FRAME_EXTRACTOR_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let frameExtractorWindow: BrowserWindow | null = null;
let currentTheme = 'light';

const createMainWindow = (): void => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    height: 768,
    show: false,
    width: 1024,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.on("ready-to-show", () => {
    mainWindow?.webContents.send("theme-update", currentTheme);
    mainWindow?.show();
  });

  // Open the DevTools.
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

const createFrameExtractorWindow = (metadata: IVideoMetadata): void => {
  if (mainWindow) {
    frameExtractorWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      parent: mainWindow,
      modal: true,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: true,
        contextIsolation: true,
      },
    });

    frameExtractorWindow.loadURL(VIDEO_FRAME_EXTRACTOR_WEBPACK_ENTRY);

    frameExtractorWindow.once("ready-to-show", () => {
      frameExtractorWindow?.webContents.send("theme-update", currentTheme);
      frameExtractorWindow?.show();
      frameExtractorWindow?.webContents.send("video-metadata", metadata);
    });
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");
  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createMainWindow();
  if (mainWindow) {
    registerIPCHandlers(mainWindow);
  }

  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    //   // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerIPCHandlers(mainWindow: BrowserWindow): void {
  // IPC test
  ipcMain.on("ping", () => console.log("pong"));

  // Change Theme on all windows
  ipcMain.on("change-theme", (_, newTheme: string) => {
    console.log("Main Process: Changing theme to", newTheme);
    currentTheme = newTheme;
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send("theme-update", currentTheme);
    });
  });

  // Load video into vtd
  ipcMain.on("load-video", async (event) => {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
          {
            name: "Arquivos de Video",
            extensions: ["mkv", "mpg", "mpeg", "avi", "mov", "mp4"],
          },
          { name: "Todos os Arquivos", extensions: ["*"] },
        ],
      });
      if (filePaths.length > 0) {
        const filePath = filePaths[0];
        if (!fs.existsSync(filePath)) {
          throw new Error("Arquivo não encontrado");
        }

        const videoMetadata = await getMetadata(filePath);
        event.reply("load-video-response", {
          success: true,
          message: "Video metadata parsed, opening VFE...",
        });
        createFrameExtractorWindow(videoMetadata as IVideoMetadata);
      }
    } catch (err: unknown) {
      console.error(err);
      event.reply("load-video-response", {
        success: false,
        message: "Couldn't parse video metadata.",
      });
    }
  });

  // Process video frame
  ipcMain.on("process-video-frame", async (event, filePath, timeInSeconds) => {
    console.log("Starting video frame process", filePath, timeInSeconds);
    try {
      const videoFrame = await processVideoFrame(filePath, timeInSeconds);
      event.reply("process-video-frame-response", {
        success: true,
        message: "Video frame processed.",
        data: videoFrame,
      });
    } catch (err) {
      console.error(err, "erro ao preocessar frame");
      event.reply("process-video-frame-response", {
        success: false,
        message: "Error processing frame.",
      });
    }
  });

  // Send frame to WorkArea
  ipcMain.on("send-frame-to-work-area", async (_, imageUrl) => {
    mainWindow.webContents.send("load-image-response", {
      success: true,
      data: imageUrl,
      message: "Sending frame to work area",
    });
  });

  // Load images into vtd
  ipcMain.on("load-image", async (event) => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        {
          name: "Arquivos de Imagem",
          extensions: ["jpg", "jpeg", "png", "svg", "bmp"],
        },
        { name: "Arquivos Bitmap", extensions: ["bmp"] },
        { name: "Arquivos JPG", extensions: ["jpg, jpeg"] },
        { name: "Arquivos PNG", extensions: ["png"] },
        { name: "Arquivos SVG", extensions: ["svg"] },
        { name: "Todos os Arquivos", extensions: ["*"] },
      ],
    });
    if (filePaths.length > 0) {
      const filePath = filePaths[0];
      const extension = filePath.split(".").pop()?.toLowerCase();
      fs.readFile(
        filePaths[0],
        (err: NodeJS.ErrnoException | null, data: Buffer) => {
          if (err) {
            console.log(err);
            event.reply("load-image-response", {
              success: false,
              message: "Failed to load file.",
            });
            return;
          }
          const base64 = Buffer.from(data).toString("base64");
          if (extension === "svg") {
            const base64Data = `data:image/svg+xml;base64,${base64}`;
            event.reply("load-image-response", {
              success: true,
              message: `Loading ${extension} image...`,
              data: base64Data,
            });
          } else {
            const mimeType = `image/${extension === "jpg" ? "jpeg" : extension}`;
            const base64Data = `data:${mimeType};base64,${base64}`;
            event.reply("load-image-response", {
              success: true,
              message: `Loading ${extension} image...`,
              data: base64Data,
            });
          }
        },
      );
    }
  });

  // Export Canvas as an image
  ipcMain.on(
    "export-canvas",
    async (event, { format, dataString }: {format: string;  dataString: string }) => {
      const { filePath } = await dialog.showSaveDialog({
        title: "Exportar Canvas",
        defaultPath: "canvas",
        filters: [{ name: "Arquivos de Imagem", extensions: [format] }],
      });
      if (filePath) {
        const base64Data = dataString.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        fs.writeFile(filePath, buffer, (err) => {
          if (err) {
            event.reply("export-canvas-response", {
              success: false,
              message: "Failed to save file.",
            });
            return;
          }
          event.reply("export-canvas-response", {
            success: true,
            message: "File saved successfully.",
          });
        });
      }
    },
  );

  // Save Project onto file
  ipcMain.on(
    "save-project",
    async (event, { dataString }: { dataString: string }) => {
      const { filePath } = await dialog.showSaveDialog({
        title: "Salvar Projeto",
        defaultPath: "projeto.json",
        filters: [{ name: "JSON Files", extensions: ["json"] }],
      });
      if (filePath) {
        fs.writeFile(filePath, dataString, (err) => {
          if (err) {
            event.reply("save-project-response", {
              success: false,
              message: "Failed to save file.",
            });
            return;
          }
          event.reply("save-project-response", {
            success: true,
            message: "File saved successfully.",
          });
        });
      }
    },
  );

  // Load Project from file
  ipcMain.on("load-project", async (event) => {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });
    if (filePaths.length > 0) {
      fs.readFile(filePaths[0], "utf-8", (err, data: string) => {
        if (err) {
          event.reply("load-project-response", {
            success: false,
            message: "Failed to load file.",
          });
          return;
        }
        event.reply("load-project-response", {
          success: true,
          message: "File loaded successfully.",
          data,
        });
      });
    } else {
      event.reply("load-project-response", {
        success: false,
        message: "No file selected.",
      });
    }
  });
}
