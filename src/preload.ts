export {};

interface EventResponse {
  success: boolean;
  data?: unknown;
  message: string;
}

declare global {
  interface Window {
    api: {
      changeTheme: (theme: string) => void;
      exportCanvas: (format: string, dataString: string) => void;
      loadImage: () => void;
      loadVideo: () => void;
      loadProject: () => void;
      generateThumbnailSprite: (metadata: IVideoMetadata) => void;
      processVideoFrame: (filePath: string, timeInSeconds: number) => void;
      saveProject: (dataString: string) => void;
      sendFrameToWorkArea: (imageUrl: string) => void;
      onGenerateThumbnailSpriteResponse: (
        callback: (
          event: Electron.IpcRendererEvent,
          response: EventResponse,
        ) => void,
      ) => Electron.IpcRenderer;
      onProcessVideoFrameResponse: (
        callback: (
          event: Electron.IpcRendererEvent,
          response: EventResponse,
        ) => void,
      ) => Electron.IpcRenderer;
      onLoadImageResponse: (
        callback: (
          event: Electron.IpcRendererEvent,
          response: EventResponse,
        ) => void,
      ) => Electron.IpcRenderer;
      onLoadVideoResponse: (
        callback: (
          event: Electron.IpcRendererEvent,
          response: EventResponse,
        ) => void,
      ) => Electron.IpcRenderer;
      onLoadProjectResponse: (
        callback: (
          event: Electron.IpcRendererEvent,
          response: EventResponse,
        ) => void,
      ) => Electron.IpcRenderer;
      onSaveProjectResponse: (
        callback: (
          event: Electron.IpcRendererEvent,
          response: EventResponse,
        ) => void,
      ) => Electron.IpcRenderer;
      onVideoMetadata: (
        callback: (metadata: IVideoMetadata) => void,
      ) => Electron.IpcRenderer;
      ping: () => void;
      onThemeUpdate: (
        callback: (
          event: Electron.IpcRendererEvent,
          newTheme: string,
        ) => Electron.IpcRenderer,
      ) => void;
    };
    electron: typeof electronAPI;
  }
}
import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import type { IVideoMetadata } from "src/types";

// Custom APIs for renderer
const api = {
  changeTheme: (theme: string): void => ipcRenderer.send("change-theme", theme),
  exportCanvas: (format: string, dataString: string): void =>
    ipcRenderer.send("export-canvas", { format, dataString }),
  loadImage: (): void => ipcRenderer.send("load-image"),
  loadVideo: (): void => ipcRenderer.send("load-video"),
  loadProject: (): void => ipcRenderer.send("load-project"),
  generateThumbnailSprite: (metadata: IVideoMetadata): void =>
    ipcRenderer.send("generate-thumbnail-sprite", metadata),
  processVideoFrame: (filePath: string, timeInSeconds: number): void =>
    ipcRenderer.send("process-video-frame", filePath, timeInSeconds),
  saveProject: (dataString: string): void =>
    ipcRenderer.send("save-project", { dataString }),
  sendFrameToWorkArea: (imageUrl: string): void =>
    ipcRenderer.send("send-frame-to-work-area", imageUrl),
  onGenerateThumbnailSpriteResponse: (
    callback: (
      event: Electron.IpcRendererEvent,
      response: EventResponse,
    ) => void,
  ): Electron.IpcRenderer =>
    ipcRenderer.on("generate-thumbnail-sprite-response", callback),
  onProcessVideoFrameResponse: (
    callback: (
      event: Electron.IpcRendererEvent,
      response: EventResponse,
    ) => void,
  ): Electron.IpcRenderer =>
    ipcRenderer.on("process-video-frame-response", callback),
  onLoadImageResponse: (
    callback: (
      event: Electron.IpcRendererEvent,
      response: EventResponse,
    ) => void,
  ): Electron.IpcRenderer => ipcRenderer.on("load-image-response", callback),
  onLoadVideoResponse: (
    callback: (
      event: Electron.IpcRendererEvent,
      response: EventResponse,
    ) => void,
  ): Electron.IpcRenderer => ipcRenderer.on("load-video-response", callback),
  onLoadProjectResponse: (
    callback: (
      event: Electron.IpcRendererEvent,
      response: EventResponse,
    ) => void,
  ): Electron.IpcRenderer => ipcRenderer.on("load-project-response", callback),
  onSaveProjectResponse: (
    callback: (
      event: Electron.IpcRendererEvent,
      response: EventResponse,
    ) => void,
  ): Electron.IpcRenderer => ipcRenderer.on("save-project-response", callback),
  onVideoMetadata: (
    callback: (arg0: IVideoMetadata) => void,
  ): Electron.IpcRenderer =>
    ipcRenderer.on("video-metadata", (_, metadata) => callback(metadata)),
  ping: () => ipcRenderer.send("ping"),
  onThemeUpdate: (
    callback: (event: Electron.IpcRendererEvent, newTheme: string) => void,
  ): void => {
    ipcRenderer.on("theme-update", callback);
  },
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
  window.electron = electronAPI;
  window.api = api;
}
