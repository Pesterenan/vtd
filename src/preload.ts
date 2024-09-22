/* eslint-disable @typescript-eslint/ban-ts-comment */
import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Custom APIs for renderer
const api = {
  exportCanvas: (dataString: string): void =>
    ipcRenderer.send("export-canvas", { dataString }),
  loadImage: (filePath: string): void =>
    ipcRenderer.send("load-image", filePath),
  loadVideo: (filePath: string): void =>
    ipcRenderer.send("load-video", filePath),
  loadProject: (): void => ipcRenderer.send("load-project"),
  processVideoFrame: (filePath: string, timeInSeconds: number): void =>
    ipcRenderer.send("process-video-frame", filePath, timeInSeconds),
  saveProject: (dataString: string): void =>
    ipcRenderer.send("save-project", { dataString }),
  sendFrameToWorkArea: (imageUrl: string): void =>
    ipcRenderer.send("send-frame-to-work-area", imageUrl),
  onProcessVideoFrameResponse: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ): Electron.IpcRenderer =>
    ipcRenderer.on("process-video-frame-response", callback),
  onLoadImageResponse: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ): Electron.IpcRenderer => ipcRenderer.on("load-image-response", callback),
  onLoadVideoResponse: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ): Electron.IpcRenderer => ipcRenderer.on("load-video-response", callback),
  onLoadProjectResponse: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ): Electron.IpcRenderer => ipcRenderer.on("load-project-response", callback),
  onSaveProjectResponse: (
    callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ): Electron.IpcRenderer => ipcRenderer.on("save-project-response", callback),
  onVideoMetadata: (callback: (arg0: any) => void): Electron.IpcRenderer =>
    ipcRenderer.on("video-metadata", (_, metadata) => callback(metadata)),
  ping: () => ipcRenderer.send("ping"),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
