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
      saveProject: (projectData: Partial<IProjectData>) => void;
      sendFrameToWorkArea: (imageUrl: string) => void;
      setWindowTitle: (title: string) => void;
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
      saveProjectAs: (projectData: Partial<IProjectData>) => void;
      newProject: (projectData: Partial<IProjectData>) => void;
      onRequestNewProject: (
        callback: (event: Electron.IpcRendererEvent) => void,
      ) => Electron.IpcRenderer;
      onRequestLoadProject: (
        callback: (event: Electron.IpcRendererEvent) => void,
      ) => Electron.IpcRenderer;
      onRequestSaveProject: (
        callback: (event: Electron.IpcRendererEvent) => void,
      ) => Electron.IpcRenderer;
      onRequestSaveProjectAs: (
        callback: (event: Electron.IpcRendererEvent) => void,
      ) => Electron.IpcRenderer;
    };
    electron: typeof electronAPI;
  }
}
import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";
import type { IVideoMetadata } from "src/types";
import type { IProjectData } from "./components/types";

// Custom APIs for renderer
const api = {
  changeTheme: (theme: string): void => ipcRenderer.send("change-theme", theme),
  exportCanvas: (format: string, dataString: string): void =>
    ipcRenderer.send("export-canvas", { format, dataString }),
  loadImage: (): void => ipcRenderer.send("load-image"),
  loadVideo: (): void => ipcRenderer.send("load-video"),
  loadProject: (): void => ipcRenderer.send("request-load-project"),
  generateThumbnailSprite: (metadata: IVideoMetadata): void =>
    ipcRenderer.send("generate-thumbnail-sprite", metadata),
  processVideoFrame: (filePath: string, timeInSeconds: number): void =>
    ipcRenderer.send("process-video-frame", filePath, timeInSeconds),
  saveProject: (projectData: Partial<IProjectData>): void =>
    ipcRenderer.send("request-save-project", projectData),
  saveProjectAs: (projectData: Partial<IProjectData>): void =>
    ipcRenderer.send("request-save-project-as", projectData),
  newProject: (projectData: Partial<IProjectData>): void =>
    ipcRenderer.send("request-new-project", projectData),
  sendFrameToWorkArea: (imageUrl: string): void =>
    ipcRenderer.send("send-frame-to-work-area", imageUrl),
  setWindowTitle: (title: string): void => ipcRenderer.send("set-window-title", title),
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
  onRequestNewProject: (
    callback: (event: Electron.IpcRendererEvent) => void,
  ): Electron.IpcRenderer => ipcRenderer.on("request-new-project", callback),
  onRequestLoadProject: (
    callback: (event: Electron.IpcRendererEvent) => void,
  ): Electron.IpcRenderer => ipcRenderer.on("request-load-project", callback),
  onRequestSaveProject: (
    callback: (event: Electron.IpcRendererEvent) => void,
  ): Electron.IpcRenderer => ipcRenderer.on("request-save-project", callback),
  onRequestSaveProjectAs: (
    callback: (event: Electron.IpcRendererEvent) => void,
  ): Electron.IpcRenderer =>
    ipcRenderer.on("request-save-project-as", callback),
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
