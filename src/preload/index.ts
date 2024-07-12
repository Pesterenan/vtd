import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  loadImage: (filePath: string): void => ipcRenderer.send('load-image', filePath),
  loadProject: (): void => ipcRenderer.send('load-project'),
  saveProject: (dataString: string): void => ipcRenderer.send('save-project', { dataString }),
  onLoadImageResponse: (callback): Electron.IpcRenderer =>
    ipcRenderer.on('load-image-response', callback),
  onLoadProjectResponse: (callback): Electron.IpcRenderer =>
    ipcRenderer.on('load-project-response', callback),
  onSaveProjectResponse: (callback): Electron.IpcRenderer =>
    ipcRenderer.on('save-project-response', callback)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
