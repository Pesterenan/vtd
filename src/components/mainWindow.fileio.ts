import type { EventBus } from "src/utils/eventBus";
import type { WorkArea } from "./workArea";
import { invoke } from "@tauri-apps/api/core";
import type { Event } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import type { IProjectData, TElementData } from "./types";
import { version as APP_VERSION } from "../../package.json";

type LoadProjectResponse = {
  success: boolean;
  message: string;
  data?: unknown;
  filePath?: string;
};

type Deps = {
  eventBus: EventBus;
  ensureWorkArea: () => WorkArea;
  getCurrentProjectPath: () => string | null;
  getProjectTitle: () => string;
  getWorkArea: () => WorkArea | null;
  hideLoading: () => void;
  resizeWindow: () => void;
  setCurrentProjectPath: (path: string | null) => void;
  setProjectTitle: (title: string) => void;
  showLoading: (message?: string) => void;
};

export class FileIOManager {
  private unlistenFns: Array<() => void> = [];

  constructor(private deps: Deps) {}
  private handleAddImage = (dataUrl?: string) => this.loadImageFile(dataUrl);
  private handleCreateNewProject = ({
    projectData,
  }: {
    projectData: IProjectData;
  }) => {
    void this.loadOrCreateNewProject(projectData);
  };
  private importImageFromDialog = async (): Promise<void> => {
    try {
      const response = await invoke<{
        success: boolean;
        message: string;
        data?: string;
      }>("load_image");
      this.deps.eventBus.emit("alert:add", {
        message: response.message,
        type: response.success ? "success" : "error",
      });
      if (response.success) {
        this.handleAddImage(response.data);
      }
    } finally {
      this.deps.hideLoading();
    }
  };

  public attach() {
    const eb = this.deps.eventBus;
    eb.on("workarea:addImage", this.handleAddImage);
    eb.on("workarea:createNewProject", this.handleCreateNewProject);
    listen("menu:import-image", () => void this.importImageFromDialog()).then(
      (unlisten) => this.unlistenFns.push(unlisten),
    );
    listen("request-save-project", () => {
      const filePath = this.deps.getCurrentProjectPath();
      void this.saveProjectToBackend(filePath);
    }).then((unlisten) => this.unlistenFns.push(unlisten));
    listen(
      "request-save-project-as",
      () => void this.saveProjectToBackend(null),
    ).then((unlisten) => this.unlistenFns.push(unlisten));
    listen<LoadProjectResponse>(
      "load-project-response",
      (event) => void this.loadProject(event),
    ).then((unlisten) => this.unlistenFns.push(unlisten));
  }

  public detach() {
    const eb = this.deps.eventBus;
    eb.off("workarea:addImage", this.handleAddImage);
    eb.off("workarea:createNewProject", this.handleCreateNewProject);
    this.unlistenFns.forEach((unlisten) => unlisten());
    this.unlistenFns = [];
  }

  public readBlobAsDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  }

  public async loadImageFile(imgString?: string): Promise<void> {
    if (!imgString) return;
    const existing = this.deps.getWorkArea();
    if (existing) {
      const newElement = await existing.addImageElement(imgString);
      newElement.layerName = `Camada ${newElement.elementId}`;
      this.deps.resizeWindow();
      this.deps.eventBus.emit("workarea:selectById", {
        elementsId: new Set([newElement.elementId]),
      });
      return;
    }
    this.deps.ensureWorkArea();
    this.deps.setProjectTitle("Sem título");
    const imageEl = new Image();
    imageEl.src = imgString;
    imageEl.onload = async () => {
      const area = this.deps.getWorkArea();
      if (!area) return;
      area.setWorkAreaSize({
        width: imageEl.width,
        height: imageEl.height,
      });
      const newElement = await area.addImageElement(imgString);
      newElement.layerName = `Camada ${newElement.elementId}`;
      this.deps.resizeWindow();
      this.deps.eventBus.emit("workarea:initialized");
      invoke("initialize_project_state", {
        title: this.deps.getProjectTitle(),
      });
      this.deps.eventBus.emit("workarea:selectById", {
        elementsId: new Set([newElement.elementId]),
      });
    };
  }

  public getProjectData(): Partial<IProjectData> {
    const workArea = this.deps.getWorkArea();
    if (workArea?.canvas && workArea?.elements) {
      const now = new Date().toISOString();
      const projectData = {
        modifyDate: now,
        title: this.deps.getProjectTitle(),
        version: APP_VERSION,
        workAreaSize: {
          width: workArea.canvas.width,
          height: workArea.canvas.height,
        },
        elements: workArea.elements.map((el) =>
          el.serialize(),
        ) as TElementData[],
      };
      return projectData;
    }
    return {};
  }

  private loadProject = async (event: Event<LoadProjectResponse>) => {
    const { success, message, data, filePath } = event.payload;
    this.deps.eventBus.emit("alert:add", {
      message,
      type: success ? "success" : "error",
    });
    if (success) {
      this.deps.setCurrentProjectPath(filePath ?? null);
      await this.loadOrCreateNewProject(data as Partial<IProjectData>);
    } else {
      console.error(message);
    }
    this.deps.hideLoading();
  };

  private loadOrCreateNewProject = async (
    projectData: Partial<IProjectData>,
  ): Promise<void> => {
    const workArea = this.deps.ensureWorkArea();
    this.deps.setProjectTitle(projectData?.title || "Sem título");
    workArea.setWorkAreaSize(projectData.workAreaSize);
    await workArea.loadElements(projectData?.elements);
    this.deps.resizeWindow();
    this.deps.eventBus.emit("workarea:initialized");
    invoke("initialize_project_state", { title: this.deps.getProjectTitle() });
  };

  private saveProjectToBackend = async (filePath: string | null) => {
    const projectData = this.getProjectData();
    if (Object.keys(projectData).length === 0) return;

    this.deps.showLoading("Salvando projeto...");
    try {
      const result = await invoke<{
        success: boolean;
        message: string;
        data?: string;
      }>("save_project_file", {
        projectData: JSON.stringify(projectData),
        filePath,
      });
      this.deps.eventBus.emit("alert:add", {
        message: result.message,
        type: result.success ? "success" : "error",
      });
      if (result.success && result.data) {
        this.deps.setCurrentProjectPath(result.data);
      }
    } finally {
      this.deps.hideLoading();
    }
  };
}
