import { SIDE_MENU_WIDTH, TOOL_MENU_WIDTH } from "src/constants";
import type { EventBus } from "src/utils/eventBus";
import getElementById from "src/utils/getElementById";
import { WorkArea } from "./workArea";
import type { IProjectData, Position, TElementData } from "./types";
import { TOOL } from "./types";
import type { Tool } from "./tools/abstractTool";
import { ToolManager } from "./tools/toolManager";
import { DialogApplyCrop } from "./Dialogs/DialogApplyCrop";
import { DialogElementFilters } from "./Dialogs/DialogElementFilters";
import { DialogExportImage } from "./Dialogs/DialogExportImage";
import { DialogNewProject } from "./Dialogs/DialogNewProject";
import { DialogProjectProperties } from "./Dialogs/DialogProjectProperties";
import { SelectTool } from "./tools/selectTool";
import { GradientTool } from "./tools/gradientTool";
import { GrabTool } from "./tools/grabTool";
import { HandTool } from "./tools/handTool";
import { ZoomTool } from "./tools/zoomTool";
import { ScaleTool } from "./tools/scaleTool";
import { RotateTool } from "./tools/rotateTool";
import { TextTool } from "./tools/textTool";
import { remap } from "src/utils/easing";
import { MIGRATION } from "src/migrationFlags";
import { DialogAbout } from "./Dialogs/DialogAbout";
import { LoadingOverlay } from "./loadingOverlay";
import { version as APP_VERSION } from "../../package.json";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

export class MainWindow {
  private static instance: MainWindow | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private workArea: WorkArea | null = null;
  private offset: Position = { x: 0, y: 0 };
  private zoomLevel = 1;
  private toolManager: ToolManager | undefined;
  private tools: { [key in TOOL]: Tool; } | undefined;
  public currentTool: TOOL = TOOL.SELECT;
  public lastTool: TOOL | null = TOOL.SELECT;

  private loadingOverlay: LoadingOverlay;
  private projectTitle = "";
  private currentProjectPath: string | null = null;
  private copiedElements: TElementData[] = [];

  private constructor(private eventBus: EventBus) {
    this.createDOMElements();
    this.createEventListeners();
    if (!MIGRATION.Dialogs) {
      new DialogApplyCrop(eventBus);
      new DialogElementFilters(eventBus);
      new DialogExportImage(eventBus);
      new DialogNewProject(eventBus);
      new DialogProjectProperties(eventBus);
      new DialogAbout(eventBus);
    }
    if (!MIGRATION.LoadingOverlay) {
      this.loadingOverlay = new LoadingOverlay(100);
    } else {
      this.loadingOverlay = {
        show: (msg?: string) => this.eventBus.emit("loading:show", msg),
        hide: () => this.eventBus.emit("loading:hide"),
      } as LoadingOverlay;
    }
    if (this.canvas) {
      this.toolManager = new ToolManager(this.canvas, this.eventBus);
      this.tools = {
        [TOOL.SELECT]: new SelectTool(this.canvas, this.eventBus),
        [TOOL.GRADIENT]: new GradientTool(this.canvas, this.eventBus),
        [TOOL.GRAB]: new GrabTool(this.canvas, this.eventBus),
        [TOOL.HAND]: new HandTool(this.canvas, this.eventBus),
        [TOOL.ZOOM]: new ZoomTool(this.canvas, this.eventBus),
        [TOOL.SCALE]: new ScaleTool(this.canvas, this.eventBus),
        [TOOL.ROTATE]: new RotateTool(this.canvas, this.eventBus),
        [TOOL.TEXT]: new TextTool(this.canvas, this.eventBus),
      };
    }
    this.handleResizeWindow();
    this.changeTool();
  }

  private createDOMElements(): void {
    const canvasContainer = getElementById<HTMLDivElement>("canvas-container");
    this.canvas = document.createElement("canvas");
    this.canvas.id = "main-canvas";
    this.canvas.width = window.innerWidth - TOOL_MENU_WIDTH - SIDE_MENU_WIDTH;
    this.canvas.height = window.innerHeight;
    this.context = this.canvas.getContext("2d");
    if (canvasContainer && this.canvas) {
      canvasContainer.appendChild(this.canvas);
    }
  }

  private createEventListeners() {
    // Backend Listeners
    listen<{ success: boolean; message: string; data?: string }>('load-image-response', async (event) => {
      const { message, success, data } = event.payload;
      this.eventBus.emit("alert:add", {
        message: message,
        type: success ? "success" : "error",
      });
      if (success) {
        await this.loadImageOnWorkArea(data as string);
      }
    });
    listen<string>("menu:loading-show", (event) => this.loadingOverlay.show(event.payload));
    listen<{ success: boolean; message: string; data?: unknown; filePath?: string }>('load-project-response', async (event) => {
      const { success, message, data, filePath } = event.payload;
      this.eventBus.emit("alert:add", {
        message,
        type: success ? "success" : "error",
      });
      if (success) {
        this.currentProjectPath = filePath ?? null;
        await this.loadOrCreateNewProject(data as Partial<IProjectData>);
      } else {
        console.error(message);
      }
      this.loadingOverlay.hide();
    });
    listen("request-new-project", () => this.eventBus.emit("dialog:newProject:open"));
    listen("request-save-project", async () => {
      const projectData = this.saveProject();
      if (Object.keys(projectData).length === 0) return;

      this.loadingOverlay.show("Salvando projeto...");
      const result = await invoke<{ success: boolean; message: string; data?: string }>(
        "save_project_file",
        {
          projectData: JSON.stringify(projectData),
          filePath: this.currentProjectPath,
        },
      );
      this.loadingOverlay.hide();
      this.eventBus.emit("alert:add", {
        message: result.message,
        type: result.success ? "success" : "error",
      });
      if (result.success && result.data) {
        this.currentProjectPath = result.data;
      }
    });
    listen("request-save-project-as", async () => {
      const projectData = this.saveProject();
      if (Object.keys(projectData).length === 0) return;

      this.loadingOverlay.show("Salvando projeto...");
      const result = await invoke<{ success: boolean; message: string; data?: string }>(
        "save_project_file",
        {
          projectData: JSON.stringify(projectData),
          filePath: null,
        },
      );
      this.loadingOverlay.hide();
      this.eventBus.emit("alert:add", {
        message: result.message,
        type: result.success ? "success" : "error",
      });
      if (result.success && result.data) {
        this.currentProjectPath = result.data;
      }
    });
    listen("menu:import-image", () => {
      invoke<{ success: boolean; message: string; data?: string }>("load_image").then((response) => {
        this.eventBus.emit("alert:add", {
          message: response.message,
          type: response.success ? "success" : "error",
        });
        if (response.success) {
          this.eventBus.emit("workarea:addImage", response.data);
        }
      }).finally(() => this.loadingOverlay.hide());
    });
    listen("menu:extract-video", () => {
      invoke<{ success: boolean; message: string; data?: unknown }>("load_video").then((response) => {
        this.eventBus.emit("alert:add", {
          message: response.message,
          type: response.success ? "success" : "error",
        });
        if (response.success) {
          invoke("create_frame_extractor_window", { metadata: response.data });
        }
      }).finally(() => this.loadingOverlay.hide());
    });
    listen("menu:export-image", () => {
      this.eventBus.emit("dialog:exportImage:open");
    });
    listen("request-close-project", () => this.eventBus.emit("workarea:clear"));
    listen("request-project-properties", () => {
      this.eventBus.emit("dialog:projectProperties:open", {
        appVersion: APP_VERSION,
        size: {
          width: this.workArea?.canvas?.width ?? 1920,
          height: this.workArea?.canvas?.height ?? 1080,
        },
        title: this.projectTitle,
        filePath: this.currentProjectPath,
      });
    });
    listen("request-show-about-dialog", () => this.eventBus.emit("dialog:about:open"));
    listen("workarea:rotate-clockwise", () => this.eventBus.emit("workarea:rotate-clockwise"));
    listen("workarea:rotate-anti-clockwise", () => this.eventBus.emit("workarea:rotate-anti-clockwise"));
    listen("workarea:flip-horizontal", () => this.eventBus.emit("workarea:flip-horizontal"));
    listen("workarea:flip-vertical", () => this.eventBus.emit("workarea:flip-vertical"));
    listen("copy-to-clipboard", () => this.handleCopyCommand());
    listen("paste-from-clipboard", () => this.handlePasteCommand());

    // Window Listeners (Tauri API - fails silently if not on within Tauri)
    try {
      getCurrentWindow().onResized(this.handleResizeWindow);
      getCurrentWindow().onFocusChanged(this.handleWindowFocus);
    } catch {
      // running outside Tauri (e.g. `npm run dev` in browser)
    }
    window.addEventListener("copy", this.handleCopyCommand);
    window.addEventListener("paste", (e: Event) => this.handlePasteCommand(e as ClipboardEvent));
    window.addEventListener("dragover", this.handleDragOver);
    window.addEventListener("drop", this.handleDrop);
    window.addEventListener("keypress", this.handleKeyPress);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    // EventBus Listeners
    this.eventBus.on("tool:change", (tool: TOOL) => {
      if (this.toolManager && this.tools) {
        this.toolManager.use(this.tools[tool]);
      }
    });
    this.eventBus.on("mainWindow:resize", this.handleResizeWindow);
    this.eventBus.on("workarea:offset:change", ({ position }) => {
      this.offset.x += position.x;
      this.offset.y += position.y;
      this.update();
    });
    this.eventBus.on("workarea:offset:get", () => this.offset);
    this.eventBus.on("workarea:project:save", () => this.saveProject());
    this.eventBus.on("workarea:clear", async () => {
      if (this.workArea) {
        this.workArea.destroy();
        this.workArea = null;
      }
      this.eventBus.emit("tool:change", TOOL.SELECT);
      this.update();
    });
    this.eventBus.on("zoomLevel:change", ({ level, center }) => {
      const previousLevel = this.zoomLevel;
      this.zoomLevel = level;
      this.offset = {
        x: center.x - (center.x - this.offset.x) * (level / previousLevel),
        y: center.y - (center.y - this.offset.y) * (level / previousLevel),
      };
      this.update();
    });
    this.eventBus.on("zoomLevel:get", () => this.zoomLevel);
    this.eventBus.on("workarea:createNewProject", ({ projectData }) =>
      this.loadOrCreateNewProject(projectData),
    );
    this.eventBus.on("workarea:updateProperties", ({ title }) => {
      this.projectTitle = title;
    });
    this.eventBus.on("workarea:update", this.update);
    this.eventBus.on("workarea:adjustForCanvas", ({ position }) =>
      this.adjustForCanvas(position),
    );
    this.eventBus.on("workarea:adjustForScreen", ({ position }) =>
      this.adjustForScreen(position),
    );
    this.eventBus.on("selection:changed", ({ selectedElements }) => {
      invoke("enable_copy", { isEnabled: selectedElements.length > 0 });
      if (this.copiedElements.length === 0) {
        this.checkExternalClipboard();
      }
    });

    this.eventBus.on("workarea:addImage", (dataUrl: string) => {
      this.loadImageOnWorkArea(dataUrl);
    });

    if (this.canvas) {
      this.canvas.addEventListener("dblclick", () => {
        if (!this.workArea) {
          this.eventBus.emit("dialog:newProject:open");
        }
      });
      this.canvas.addEventListener("dragover", this.handleDragOverEvent);
      this.canvas.addEventListener("drop", this.handleDropItems);
    }
  }

  private async loadImageOnWorkArea(imgString: string): Promise<void> {
    if (!imgString) return;
    if (!this.workArea) {
      this.workArea = new WorkArea(this.eventBus);
      const imageEl = new Image();
      imageEl.src = imgString;
      imageEl.onload = async () => {
        if (this.workArea) {
          this.workArea.setWorkAreaSize({
            width: imageEl.width,
            height: imageEl.height,
          });
          const newElement = await this.workArea.addImageElement(imgString);
          newElement.layerName = `Camada ${newElement.elementId}`;
          this.projectTitle = "Sem título";
          this.handleResizeWindow();
          this.eventBus.emit("workarea:initialized");
          invoke("initialize_project_state", { title: "Sem título" });
          this.eventBus.emit("workarea:selectById", {
            elementsId: new Set([newElement.elementId]),
          });
        }
      };
    } else {
      const newElement = await this.workArea.addImageElement(imgString);
      newElement.layerName = `Camada ${newElement.elementId}`;
      this.handleResizeWindow();
      this.eventBus.emit("workarea:selectById", {
        elementsId: new Set([newElement.elementId]),
      });
    }
  }

  private handleDragOverEvent = (evt: DragEvent) => {
    evt.preventDefault();
  };

  private handleDropItems = (evt: DragEvent): void => {
    evt.preventDefault();
    const droppedItems = evt.dataTransfer?.items;
    if (!droppedItems) return;

    for (const item of droppedItems) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = async (evt) => {
            await this.loadImageOnWorkArea(evt.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  private handleCopyCommand = (): void => {
    const [selectedElements] = this.eventBus.request("workarea:selected:get");
    if (selectedElements.length) {
      this.copiedElements = selectedElements.map((el) =>
        el.serialize(),
      ) as TElementData[];
      invoke("enable_paste", { isEnabled: true });
      this.eventBus.emit("alert:add", {
        message: `${this.copiedElements.length > 1 ? "Elementos copiados" : "Elemento copiado"} para a área de transferência`,
        type: "success",
      });
    }
  };

  public handlePasteCommand = async (event?: ClipboardEvent): Promise<void> => {
    if (this.copiedElements.length > 0 && this.workArea) {
      const newElementsIds: number[] = [];
      let latestZDepth = this.workArea.elements.length;
      for (const elementData of this.copiedElements) {
        delete elementData.elementId;
        const newElement =
          await this.workArea.createElementFromData(elementData);
        if (newElement) {
          const elementId = newElement.elementId;
          newElement.zDepth = ++latestZDepth;
          newElement.layerName += " cópia";
          this.workArea.elements.push(newElement);
          this.eventBus.emit("workarea:addElement", {
            elementId,
            isLocked: newElement.isLocked,
            isVisible: newElement.isVisible,
            layerName: newElement.layerName,
            type: elementData.type,
          });
          newElementsIds.push(elementId);
        }
      }
      this.eventBus.emit("workarea:selectById", {
        elementsId: new Set(newElementsIds),
      });
      this.eventBus.emit("alert:add", {
        message: "Elementos copiados da área de transferência.",
        type: "success",
      });
      this.copiedElements.length = 0;
      this.update();
      return;
    }

    if (event?.clipboardData?.files?.length) {
      for (const file of event.clipboardData.files) {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = async (evt) => {
            await this.loadImageOnWorkArea(evt.target?.result as string);
            this.eventBus.emit("alert:add", {
              message: `Imagem "${file.name}" colada.`,
              type: "success",
            });
          };
          reader.readAsDataURL(file);
        }
      }
      this.update();
      return;
    }

    await this.pasteFromExternalClipboard();
    this.update();
  };

  private handleDragOver = (e: DragEvent): void => {
    console.log("[DEBUG] window dragover", { types: e.dataTransfer?.types, dropEffect: e.dataTransfer?.dropEffect, hasFiles: e.dataTransfer?.types.includes("Files") });
    e.preventDefault();
    if (e.dataTransfer?.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  private handleDrop = async (e: DragEvent): Promise<void> => {
    console.log("[DEBUG] window drop", { filesLength: e.dataTransfer?.files.length });
    if (!e.dataTransfer?.files.length) return;
    e.preventDefault();
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          await this.loadImageOnWorkArea(evt.target?.result as string);
          this.eventBus.emit("alert:add", {
            message: `Imagem "${file.name}" adicionada.`,
            type: "success",
          });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  private handleWindowFocus = async (): Promise<void> => {
    if (this.copiedElements.length === 0) {
      this.checkExternalClipboard();
    }
  };

  private checkExternalClipboard = async (): Promise<void> => {
    const result = await invoke<{ has_image: boolean }>("check_clipboard");
    if (result.has_image) {
      invoke("enable_paste", { isEnabled: true });
    }
  };

  private pasteFromExternalClipboard = async (): Promise<void> => {
    try {
      const result = await invoke<{ success: boolean; message: string; data?: string }>("read_clipboard_image");
      if (result.success && result.data) {
        await this.loadImageOnWorkArea(result.data);
        this.eventBus.emit("alert:add", {
          message: "Imagem copiada da área de transferência.",
          type: "success",
        });
      } else {
        this.pasteFromNavigatorClipboard();
      }
    } catch {
      this.pasteFromNavigatorClipboard();
    }
  };

  private pasteFromNavigatorClipboard = async (): Promise<void> => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) =>
          type.startsWith("image/"),
        );
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = async (evt) => {
            await this.loadImageOnWorkArea(evt.target?.result as string);
            this.eventBus.emit("alert:add", {
              message: "Imagem copiada da área de transferência.",
              type: "success",
            });
          };
          reader.readAsDataURL(blob);
        }
      }
    } catch (err) {
      this.eventBus.emit("alert:add", {
        message: "Não foi possível colar da área de transferência.",
        type: "error",
      });
    }
  };

  private handleResizeWindow = (): void => {
    if (this.canvas) {
      this.canvas.width = window.innerWidth - TOOL_MENU_WIDTH - SIDE_MENU_WIDTH;
      this.canvas.height = window.innerHeight;
      this.handleRezoom(this.canvas.width, this.canvas.height);
      this.centerWorkArea();
      this.update();
    }
  };

  private centerWorkArea(): void {
    if (this.workArea?.canvas && this.canvas) {
      this.offset = {
        x:
          this.canvas.width * 0.5 -
          this.workArea.canvas.width * this.zoomLevel * 0.5,
        y:
          this.canvas.height * 0.5 -
          this.workArea.canvas.height * this.zoomLevel * 0.5,
      };
    }
  }

  private handleRezoom(width: number, height: number) {
    if (this.workArea?.canvas) {
      const zoomWidth = remap(
        0,
        this.workArea.canvas.width,
        0,
        0.95,
        width,
        true,
      );
      const zoomHeight = remap(
        0,
        this.workArea.canvas.height,
        0,
        0.95,
        height,
        true,
      );
      this.zoomLevel = Math.min(zoomWidth, zoomHeight);
    }
  }

  private clearCanvas(): void {
    if (this.canvas && this.context) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private update = (): void => {
    if (!this.context || !this.canvas) {
      throw new Error("Cannot update MainWindow");
    }
    this.clearCanvas();
    this.context.save();
    this.context.translate(this.offset.x, this.offset.y);
    this.context.scale(this.zoomLevel, this.zoomLevel);
    if (this.workArea && this.workArea.canvas) {
      this.context.lineWidth = 8;
      this.context.strokeStyle = "black";
      this.context.strokeRect(
        0,
        0,
        this.workArea.canvas.width,
        this.workArea.canvas.height,
      );
      this.context.fillStyle = "white";
      this.context.fillRect(
        0,
        0,
        this.workArea.canvas.width,
        this.workArea.canvas.height,
      );
      this.workArea.draw();
      this.context.drawImage(
        this.workArea.canvas,
        0,
        0,
        this.workArea.canvas.width,
        this.workArea.canvas.height,
      );
      this.context.restore();
      if (this.workArea.transformBox) {
        this.workArea.transformBox.draw(this.context);
      }
    } else {
      this.clearCanvas();
    }
    this.context.restore();
    if (this.toolManager) {
      this.toolManager.draw();
    }
  };

  private loadOrCreateNewProject = async (
    projectData: Partial<IProjectData>,
  ): Promise<void> => {
    if (!this.workArea) {
      this.workArea = new WorkArea(this.eventBus);
    }
    this.projectTitle = projectData?.title || "Sem título";
    this.workArea.setWorkAreaSize(projectData.workAreaSize);
    await this.workArea.loadElements(projectData?.elements);
    this.handleResizeWindow();
    this.eventBus.emit("workarea:initialized");
    invoke("initialize_project_state", { title: this.projectTitle });
  };

  public saveProject(): Partial<IProjectData> {
    if (this.workArea?.canvas && this.workArea?.elements) {
      const now = new Date().toISOString();
      const projectData = {
        modifyDate: now,
        title: this.projectTitle,
        version: APP_VERSION,
        workAreaSize: {
          width: this.workArea.canvas.width,
          height: this.workArea.canvas.height,
        },
        elements: this.workArea.elements.map((el) =>
          el.serialize(),
        ) as TElementData[],
      };
      return projectData;
    }
    return {};
  }

  private handleKeyPress = (evt: KeyboardEvent): void => {
    if (evt.ctrlKey || evt.altKey || evt.metaKey) {
      return;
    }
    let tool: TOOL | null = null;
    switch (evt.code) {
      case "KeyV":
        tool = TOOL.SELECT;
        break;
      case "KeyG":
        tool = TOOL.GRAB;
        break;
      case "KeyR":
        tool = TOOL.ROTATE;
        break;
      case "KeyS":
        tool = TOOL.SCALE;
        break;
      case "KeyT":
        tool = TOOL.TEXT;
        break;
      case "KeyH":
        tool = TOOL.GRADIENT;
        break;
    }
    if (tool) {
      this.currentTool = tool;
      this.changeTool();
    }
  };

  private changeTool(): void {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === "TEXTAREA" ||
      activeElement?.tagName === "INPUT";
    if (isTyping) return;
    this.eventBus.emit("tool:change", this.currentTool);
  }

  private handleKeyUp = (evt: KeyboardEvent): void => {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === "TEXTAREA" ||
      activeElement?.tagName === "INPUT";
    if (isTyping) return;

    if (this.currentTool === TOOL.ZOOM || this.currentTool === TOOL.HAND) {
      switch (evt.code) {
        case "Space":
        case "KeyZ":
          this.currentTool = this.lastTool ? this.lastTool : TOOL.SELECT;
          this.changeTool();
      }
    }
  };

  private handleKeyDown = (evt: KeyboardEvent): void => {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === "TEXTAREA" ||
      activeElement?.tagName === "INPUT";
    if (isTyping) return;

    if (!evt.repeat) {
      if (evt.code === "Delete") {
        this.handleDeleteCommand();
      }

      let tool: TOOL | null = null;
      this.lastTool =
        this.currentTool !== TOOL.HAND && this.currentTool !== TOOL.ZOOM
          ? this.currentTool
          : null;
      switch (evt.code) {
        case "Space":
          tool = TOOL.HAND;
          break;
        case "KeyZ":
          tool = TOOL.ZOOM;
          break;
      }
      if (tool) {
        this.currentTool = tool;
        this.changeTool();
      }
    }
  };

  private handleDeleteCommand = (): void => {
    const [selectedElements] = this.eventBus.request("workarea:selected:get");
    if (selectedElements?.length) {
      const elementIds = selectedElements.map((el) => el.elementId);
      for (const id of elementIds) {
        this.eventBus.emit("workarea:deleteElement", { elementId: id });
      }
    }
  };

  /** Adjust canvas object position to be shown on screen */
  public adjustForScreen = (workAreaPosition: Position): Position => {
    return {
      x: Math.floor(workAreaPosition.x * this.zoomLevel) + this.offset.x,
      y: Math.floor(workAreaPosition.y * this.zoomLevel) + this.offset.y,
    };
  };

  /** Adjust mouse event position to be shown on canvas */
  public adjustForCanvas = (mousePosition: Position): Position => {
    return {
      x: Math.floor((mousePosition.x - this.offset.x) / this.zoomLevel),
      y: Math.floor((mousePosition.y - this.offset.y) / this.zoomLevel),
    };
  };
  public static getInstance(eventBus: EventBus) {
    if (!MainWindow.instance) {
      MainWindow.instance = new MainWindow(eventBus);
    }
    return MainWindow.instance;
  }
}
