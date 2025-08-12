import { SIDE_MENU_WIDTH, TOOL_MENU_WIDTH } from "src/constants";
import type { EventBus } from "src/utils/eventBus";
import getElementById from "src/utils/getElementById";
import { WorkArea } from "./workArea";
import type { IProjectData, Position, TElementData } from "./types";
import { TOOL } from "./types";
import type { Tool } from "./tools/abstractTool";
import { ToolManager } from "./tools/toolManager";
import { DialogElementFilters } from "./dialogs/DialogElementFilters";
import { DialogExportImage } from "./dialogs/DialogExportImage";
import { DialogNewProject } from "./dialogs/DialogNewProject";
import { SelectTool } from "./tools/selectTool";
import { GradientTool } from "./tools/gradientTool";
import { GrabTool } from "./tools/grabTool";
import { HandTool } from "./tools/handTool";
import { ZoomTool } from "./tools/zoomTool";
import { ScaleTool } from "./tools/scaleTool";
import { RotateTool } from "./tools/rotateTool";
import { TextTool } from "./tools/textTool";
import { remap } from "src/utils/easing";
import { TextElement } from "./elements/textElement";

export class MainWindow {
  private static instance: MainWindow | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private workArea: WorkArea | null = null;
  private offset: Position = { x: 0, y: 0 };
  private zoomLevel = 1;
  private toolManager: ToolManager | undefined;
  private tools:
    | {
        [key in TOOL]: Tool;
      }
    | undefined;
  public currentTool: TOOL = TOOL.SELECT;
  public lastTool: TOOL | null = TOOL.SELECT;

  private projectTitle = "";
  private copiedElements: TElementData[] = [];

  private constructor(private eventBus: EventBus) {
    this.createDOMElements();
    this.createEventListeners();
    new DialogElementFilters(eventBus);
    new DialogExportImage(eventBus);
    new DialogNewProject(eventBus);
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
  }

  private createDOMElements(): void {
    const appWindow = getElementById<HTMLDivElement>("app-window");
    this.canvas = document.createElement("canvas");
    this.canvas.id = "main-canvas";
    this.canvas.width = window.innerWidth - TOOL_MENU_WIDTH - SIDE_MENU_WIDTH;
    this.canvas.height = window.innerHeight;
    this.context = this.canvas.getContext("2d");

    this.changeTool();

    if (appWindow) {
      appWindow.appendChild(this.canvas);
    }
  }

  private createEventListeners() {
    window.api.onLoadVideoResponse((_, response) => {
      this.eventBus.emit("alert:add", {
        message: response.message,
        type: response.success ? "success" : "error",
      });
    });

    window.api.onLoadImageResponse((_, response) => {
      this.eventBus.emit("alert:add", {
        message: response.message,
        type: response.success ? "success" : "error",
      });
      if (response.success) {
        this.loadImageOnWorkArea(response.data as string);
      }
    });

    // TODO: Maybe dead code, verify.
    window.api.onProcessVideoFrameResponse((_, response) => {
      if (response.success) {
        const uint8Array = new Uint8Array(response.data as Uint8Array);
        const blob = new Blob([uint8Array], { type: "image/png" });
        const reader = new FileReader();
        reader.onloadend = (): void => {
          const dataURL = reader.result as string;
          if (this.workArea) {
            this.workArea.addImageElement(dataURL);
          }
        };
        reader.readAsDataURL(blob);
      }
      this.eventBus.emit("alert:add", {
        message: response.message,
        type: response.success ? "success" : "error",
      });
    });

    window.api.onLoadProjectResponse((_, response) => {
      this.eventBus.emit("alert:add", {
        message: response.message,
        type: response.success ? "success" : "error",
      });
      if (response.success) {
        this.loadOrCreateNewProject(response.data as Partial<IProjectData>);
      }
    });

    window.api.onSaveProjectResponse((_, response) => {
      this.eventBus.emit("alert:add", {
        message: response.message,
        type: response.success ? "success" : "error",
      });
    });
    window.api.onRequestNewProject(() => {
      this.eventBus.emit("dialog:newProject:open");
    });
    window.api.onRequestLoadProject(() => {
      window.api.loadProject();
    });
    window.api.onRequestSaveProject(() => {
      const projectData = this.saveProject();
      window.api.saveProject(projectData);
    });
    window.api.onRequestSaveProjectAs(() => {
      const projectData = this.saveProject();
      window.api.saveProjectAs(projectData);
    });
    window.addEventListener("copy", this.handleCopyCommand);
    window.addEventListener("paste", this.handlePasteCommand);
    window.addEventListener("resize", this.handleResizeWindow);
    window.addEventListener("keypress", this.handleKeyPress);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    this.eventBus.on("tool:change", (tool: TOOL) => {
      if (this.toolManager && this.tools) {
        this.toolManager.use(this.tools[tool]);
      }
    });
    this.eventBus.on("workarea:offset:change", ({ position }) => {
      this.offset.x += position.x;
      this.offset.y += position.y;
      this.update();
    });
    this.eventBus.on("workarea:offset:get", () => this.offset);
    this.eventBus.on("workarea:project:save", () => this.saveProject());
    this.eventBus.on("workarea:clear", () => {
      window.api.setWindowTitle("");
      this.workArea?.removeEvents();
      this.workArea = new WorkArea(this.eventBus);
      this.eventBus.emit("tool:change", TOOL.SELECT);
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
    this.eventBus.on("workarea:update", this.update);
    this.eventBus.on("workarea:adjustForCanvas", ({ position }) =>
      this.adjustForCanvas(position),
    );
    this.eventBus.on("workarea:adjustForScreen", ({ position }) =>
      this.adjustForScreen(position),
    );
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

  /** Adds the image to the workarea, and creates a new workarea if it doesn't exist yet */
  private loadImageOnWorkArea = (imgString: string): void => {
    if (!imgString) return;
    let newElement;
    if (!this.workArea) {
      this.workArea = new WorkArea(this.eventBus);
      const imageEl = new Image();
      imageEl.src = imgString;
      imageEl.onload = () => {
        if (this.workArea) {
          this.workArea.setWorkAreaSize({
            width: imageEl.width,
            height: imageEl.height,
          });
          newElement = this.workArea.addImageElement(imgString);
          this.handleResizeWindow();
          this.eventBus.emit("workarea:initialized");
          this.eventBus.emit("workarea:update");
          this.eventBus.emit("workarea:selectById", {
            elementsId: new Set([newElement.elementId]),
          });
        }
      };
    } else {
      newElement = this.workArea.addImageElement(imgString);
      this.handleResizeWindow();
      this.eventBus.emit("workarea:update");
      this.eventBus.emit("workarea:selectById", {
        elementsId: new Set([newElement.elementId]),
      });
    }
  };

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
          reader.onload = (evt) => {
            this.loadImageOnWorkArea(evt.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  private handleCopyCommand = (): void => {
    const [selectedElements] = this.eventBus.request("workarea:selected:get");
    if (!selectedElements?.length) {
      if (!this.workArea?.canvas) return;
      this.workArea.canvas.toBlob((blob) => {
        if (blob) {
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard.write([item]);
          this.eventBus.emit("alert:add", {
            message: "Área de Trabalho copiada para a área de transferência",
            type: "success",
          });
        }
      }, "image/png");
    } else {
      this.copiedElements = selectedElements.map((el) => el.serialize());
      this.eventBus.emit("alert:add", {
        message: "Elementos copiados para a área de transferência",
        type: "success",
      });
    }
  };

  public handlePasteCommand = async (): Promise<void> => {
    // Se estiver copiando elementos internos
    if (this.copiedElements.length > 0 && this.workArea) {
      const newElementsIds: number[] = [];
      let zDepth = this.workArea.elements.length;
      for (const elementData of this.copiedElements) {
        const newElement = this.workArea.createElementFromData(elementData);
        if (newElement) {
          // FIX: Entender porque a referencia está afetando os novos objetos
          // newElement.position.x += 25;
          // newElement.position.y += 25;
          newElement.zDepth = ++zDepth;
          newElement.layerName += " cópia";
          this.workArea.elements.push(newElement);
          newElementsIds.push(zDepth);
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
    } else {
      // Se estiver colando da área de transferência
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          // Tratamento de texto copiado
          if (item.types.includes("text/plain")) {
            const blob = await item.getType("text/plain");
            const text = await blob.text();
            const [selected] = this.eventBus.request("workarea:selected:get");
            // Se estiver com algum TextElement selecionado, troca o conteúdo pelo texto colado
            if (selected.length === 1 && selected[0] instanceof TextElement) {
              selected[0].content = [text];
            } else {
              // Senão, cria um elemento com esse texto
              const newElement = this.workArea?.addTextElement();
              if (newElement) {
                newElement.content = [text];
                this.eventBus.emit("workarea:selectById", {
                  elementsId: new Set([newElement.elementId]),
                });
                this.eventBus.emit("alert:add", {
                  message: "Texto copiado da área de transferência.",
                  type: "success",
                });
              }
            }
          } else {
            // Tratamento de imagem copiada
            const imageType = item.types.find((type) =>
              type.startsWith("image/"),
            );
            if (imageType) {
              const blob = await item.getType(imageType);
              const reader = new FileReader();
              reader.onload = (evt) => {
                this.loadImageOnWorkArea(evt.target?.result as string);
                this.eventBus.emit("alert:add", {
                  message: "Imagem copiada da área de transferência.",
                  type: "success",
                });
              };
              reader.readAsDataURL(blob);
            }
          }
        }
      } catch (err) {
        this.eventBus.emit("alert:add", {
          message: "Não foi possível colar da área de transferência.",
          type: "error",
        });
      }
    }
    this.update();
  };

  private handleResizeWindow = (): void => {
    if (this.canvas) {
      this.canvas.width = window.innerWidth - TOOL_MENU_WIDTH - SIDE_MENU_WIDTH;
      this.canvas.height = window.innerHeight;
      this.handleRezoom(this.canvas.width);
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

  private handleRezoom(width: number) {
    if (this.workArea?.canvas) {
      const newZoomLevel = remap(
        0,
        this.workArea.canvas.width,
        0,
        0.95,
        width,
        true,
      );
      this.zoomLevel = newZoomLevel;
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
    }
    this.context.restore();
    if (this.toolManager) {
      this.toolManager.draw();
    }
  };

  private loadOrCreateNewProject = (
    projectData: Partial<IProjectData>,
  ): void => {
    this.eventBus.emit("workarea:clear");
    if (this.workArea) {
      this.projectTitle = projectData?.title || "Sem título";
      this.workArea.setWorkAreaSize(projectData.workAreaSize);
      this.workArea.loadElements(projectData?.elements);
      window.api.setWindowTitle(this.projectTitle);
      this.handleResizeWindow();
      this.eventBus.emit("workarea:initialized");
    }
  };

  public saveProject(): Partial<IProjectData> {
    if (this.workArea?.canvas && this.workArea?.elements) {
      const now = new Date().toISOString();
      const projectData = {
        modifyDate: now,
        title: this.projectTitle,
        version: "0.0.1",
        workAreaSize: {
          width: this.workArea.canvas.width,
          height: this.workArea.canvas.height,
        },
        elements: this.workArea.elements.map((el) => el.serialize()),
      };
      return projectData;
    }
    return {};
  }

  private handleKeyPress = (evt: KeyboardEvent): void => {
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
