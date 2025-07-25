import { DialogElementFilters } from "src/components/dialogs/DialogElementFilters";
import { DialogExportImage } from "src/components/dialogs/DialogExportImage";
import { DialogNewProject } from "src/components/dialogs/DialogNewProject";
import type { Element } from "src/components/elements/element";
import { GradientElement } from "src/components/elements/gradientElement";
import { ImageElement } from "src/components/elements/imageElement";
import { TextElement } from "src/components/elements/textElement";
import type { Tool } from "src/components/tools/abstractTool";
import { GrabTool } from "src/components/tools/grabTool";
import { GradientTool } from "src/components/tools/gradientTool";
import { HandTool } from "src/components/tools/handTool";
import { RotateTool } from "src/components/tools/rotateTool";
import { ScaleTool } from "src/components/tools/scaleTool";
import { SelectTool } from "src/components/tools/selectTool";
import { TextTool } from "src/components/tools/textTool";
import { ZoomTool } from "src/components/tools/zoomTool";
import { TransformBox } from "src/components/transformBox";
import type {
  IProjectData,
  Layer,
  Position,
  ReorganizeLayersPayload,
  SelectElementPayload,
  TElementData,
  UpdateElementPayload,
} from "src/components/types";
import { TOOL } from "src/components/types";
import { SIDE_MENU_WIDTH, TOOL_MENU_WIDTH } from "src/constants";
import type { EventBus } from "src/utils/eventBus";
import getElementById from "src/utils/getElementById";
import { ElementGroup } from "./elements/elementGroup";
import { ToolManager } from "./tools/toolManager";
import { FilterRenderer } from "src/filters/filterRenderer";

const WORK_AREA_WIDTH = 1920;
const WORK_AREA_HEIGHT = 1080;

interface IWorkAreaProperties {
  context: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  offset: Position;
}

export class WorkArea {
  private static instance: WorkArea | null = null;
  public mainCanvas?: HTMLCanvasElement;
  public mainContext: CanvasRenderingContext2D | null = null;
  private elements: Element<TElementData>[] = [];
  private _transformBox: TransformBox | null = null;
  private _zoomLevel = 0.3;
  private workArea: IWorkAreaProperties | Record<string, never> = {};
  private tools: { [key in TOOL]: Tool };
  public currentTool: TOOL = TOOL.SELECT;
  public lastTool: TOOL | null = TOOL.SELECT;
  private projectTitle = "";

  public get offset(): Position {
    return this.workArea.offset;
  }
  public set offset(value: Position) {
    this.workArea.offset = value;
  }
  public get transformBox(): TransformBox | null {
    return this._transformBox;
  }
  public set transformBox(value) {
    this._transformBox = value;
  }
  public get zoomLevel(): number {
    return this._zoomLevel;
  }
  public set zoomLevel(zoomLevel: number) {
    this._zoomLevel = zoomLevel;
    this.update();
  }
  private eventBus: EventBus;
  private toolManager: ToolManager;

  private constructor(eventBus: EventBus) {
    this.createWorkAreaDOMElements();

    if (!this.mainCanvas) throw new Error("Main canvas not available");

    this.eventBus = eventBus;
    this.toolManager = new ToolManager(this.mainCanvas, this.eventBus);
    this.createElementFromData = this.createElementFromData.bind(this);
    this.tools = {
      [TOOL.SELECT]: new SelectTool(this.mainCanvas, this.eventBus),
      [TOOL.GRADIENT]: new GradientTool(this.mainCanvas, this.eventBus),
      [TOOL.GRAB]: new GrabTool(this.mainCanvas, this.eventBus),
      [TOOL.HAND]: new HandTool(this.mainCanvas, this.eventBus),
      [TOOL.ZOOM]: new ZoomTool(this.mainCanvas, this.eventBus),
      [TOOL.SCALE]: new ScaleTool(this.mainCanvas, this.eventBus),
      [TOOL.ROTATE]: new RotateTool(this.mainCanvas, this.eventBus),
      [TOOL.TEXT]: new TextTool(this.mainCanvas, this.eventBus),
    };

    this.createEventListeners();
    new DialogElementFilters(eventBus);
    new DialogExportImage(eventBus);
    new DialogNewProject(eventBus);

    this.update();
  }

  private createWorkAreaDOMElements(): void {
    const mainWindow = getElementById<HTMLDivElement>("main-window");
    this.mainCanvas = document.createElement("canvas");
    this.mainCanvas.id = "main-canvas";
    this.mainCanvas.width =
      window.innerWidth - TOOL_MENU_WIDTH - SIDE_MENU_WIDTH;
    this.mainCanvas.height = window.innerHeight;
    this.mainContext = this.mainCanvas.getContext("2d");

    const workAreaCanvas = document.createElement("canvas");
    workAreaCanvas.width = WORK_AREA_WIDTH;
    workAreaCanvas.height = WORK_AREA_HEIGHT;
    workAreaCanvas.style.backgroundColor = "white";
    const workAreaContext = workAreaCanvas.getContext("2d");
    const workAreaOffset = {
      x:
        this.mainCanvas.width * 0.5 -
        workAreaCanvas.width * this.zoomLevel * 0.5,
      y:
        this.mainCanvas.height * 0.5 -
        workAreaCanvas.height * this.zoomLevel * 0.5,
    };

    if (!this.mainContext || !workAreaContext) {
      throw new Error("Unable to get canvas context");
    }

    this.workArea = {
      canvas: workAreaCanvas,
      context: workAreaContext,
      offset: workAreaOffset,
    };

    FilterRenderer.getInstance(workAreaCanvas);

    if (mainWindow) {
      mainWindow.appendChild(this.mainCanvas);
    }
  }

  private createEventListeners(): void {
    window.api.onProcessVideoFrameResponse((_, response) => {
      if (response.success) {
        const uint8Array = new Uint8Array(response.data as Uint8Array);
        const blob = new Blob([uint8Array], { type: "image/png" });

        const reader = new FileReader();
        reader.onloadend = (): void => {
          const dataURL = reader.result as string;
          this.addImageElement(dataURL);
        };
        reader.readAsDataURL(blob);
      }
      this.eventBus.emit("alert:add", {
        message: response.message,
        type: response.success ? "success" : "error",
      });
    });

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
        this.addImageElement(response.data as string);
        requestAnimationFrame(() => requestAnimationFrame(() => this.update()));
      }
    });

    window.api.onSaveProjectResponse((_, response) => {
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
        this.loadProject(response.data as Partial<IProjectData>);
      }
    });
    if (this.mainCanvas) {
      this.eventBus.on("edit:gradient", ({ position }) => {
        const elements = this.getSelectedElements();
        if (!elements || !(elements[0] instanceof GradientElement)) {
          this.addGradientElement(position);
          this.selectElementsAt(position);
        }
      });
      this.eventBus.on("edit:text", ({ position }) => {
        this.selectElementsAt(position);
        const elements = this.getSelectedElements();
        if (!elements || !(elements[0] instanceof TextElement)) {
          this.addTextElement(position);
          this.selectElementsAt(position);
        }
      });
      this.eventBus.on("tool:change", (tool: TOOL) =>
        this.toolManager.use(this.tools[tool]),
      );
      this.eventBus.on("workarea:addGroupElement", () =>
        this.addGroupElement(),
      );
      this.eventBus.on("workarea:adjustForCanvas", ({ position }) =>
        this.adjustForCanvas(position),
      );
      this.eventBus.on("workarea:adjustForScreen", ({ position }) =>
        this.adjustForScreen(position),
      );
      this.eventBus.on("workarea:clear", () => {
        this.removeTransformBox();
        this.elements.length = 0;
      });
      this.eventBus.on(
        "workarea:deleteElement",
        this.handleDeleteElement.bind(this),
      );
      this.eventBus.on("workarea:exportCanvas", ({ format, quality }) =>
        this.convertCanvasToString(format, quality),
      );
      this.eventBus.on("workarea:offset:change", ({ delta }) => {
        this.offset.x += delta.x;
        this.offset.y += delta.y;
        this.update();
      });
      this.eventBus.on("workarea:offset:get", () => this.offset);
      this.eventBus.on("workarea:project:save", () => this.saveProject());
      this.eventBus.on("workarea:selectAt", ({ firstPoint, secondPoint }) => {
        this.selectElementsAt(firstPoint, secondPoint);
      });
      this.eventBus.on(
        "workarea:selectById",
        this.selectElementsById.bind(this),
      );
      this.eventBus.on("workarea:selected:get", () =>
        this.getSelectedElements(),
      );
      this.eventBus.on("workarea:update", this.update.bind(this));
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
      window.addEventListener("keypress", this.handleKeyPress.bind(this));
      window.addEventListener("keydown", this.handleKeyDown.bind(this));
      window.addEventListener("keyup", this.handleKeyUp.bind(this));
      window.addEventListener("resize", this.handleResize.bind(this));
      this.eventBus.on(
        "layer:generateHierarchy",
        this.handleReorganizeLayers.bind(this),
      );
      this.eventBus.on(
        "workarea:updateElement",
        this.handleUpdateElement.bind(this),
      );
      this.eventBus.on("workarea:createNewProject", ({ projectData }) =>
        this.createNewProject(projectData),
      );
      this.mainCanvas.addEventListener("dragover", (evt) => {
        evt.preventDefault();
      });
      this.mainCanvas.addEventListener("drop", this.handleDropItems.bind(this));
      window.addEventListener("paste", this.handleDropItems.bind(this));
      this.eventBus.emit("tool:change", TOOL.SELECT);
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
    }
  }

  private handleUpdateElement({
    elementId,
    layerName,
    isVisible,
    isLocked,
  }: UpdateElementPayload): void {
    const elementToUpdate = this.getFlatElements(this.elements).find(
      (el) => el.elementId === elementId,
    );
    if (elementToUpdate) {
      if (layerName !== undefined) {
        elementToUpdate.layerName = layerName;
      }
      if (isVisible !== undefined) {
        elementToUpdate.isVisible = isVisible;
      }
      if (isLocked !== undefined) {
        if (elementToUpdate instanceof ElementGroup) {
          if (elementToUpdate.children) {
            for (const child of elementToUpdate.children) {
              child.selected = false;
            }
          }
        }
        elementToUpdate.isLocked = isLocked;
        this.selectElementsAt();
      }
    }
    this.update();
  }

  private selectElementsById({ elementsId }: SelectElementPayload): void {
    const selectElement = (element: Element<TElementData>) => {
      element.selected = elementsId.has(element.elementId) && !element.isLocked;
    };
    for (const el of this.elements) {
      if (el instanceof ElementGroup) {
        if (el.children && !el.isLocked) {
          el.children.forEach(selectElement);
        }
      } else {
        selectElement(el);
      }
    }
    this.createTransformBox();
    this.update();
  }

  private getFlatElements(
    elements: Element<TElementData>[],
  ): Element<TElementData>[] {
    const flatElements: Element<TElementData>[] = [];
    for (const el of elements) {
      flatElements.push(el);
      if (el instanceof ElementGroup && el.children) {
        flatElements.push(...this.getFlatElements(el.children));
      }
    }
    return flatElements;
  }

  private processLayerHierarchy(
    hierarchy: Layer[],
    flatElements: Element<TElementData>[],
    counter: { value: number },
  ): Element<TElementData>[] {
    const orderedElements: Element<TElementData>[] = [];
    for (const layer of hierarchy) {
      const element = flatElements.find((el) => el.elementId === layer.id);
      if (element) {
        element.zDepth = counter.value++;
        element.selected = false;
        orderedElements.push(element);
        if (layer.children && element instanceof ElementGroup) {
          const childElements = this.processLayerHierarchy(
            layer.children,
            flatElements,
            counter,
          );
          (element as ElementGroup).children = childElements;
        }
      }
    }
    return orderedElements;
  }

  private handleDeleteElement(): void {
    this.removeTransformBox();
    this.update();
  }

  private handleReorganizeLayers({ hierarchy }: ReorganizeLayersPayload): void {
    const flatElements = this.getFlatElements(this.elements);
    const counter = { value: 0 };
    const newOrderedElements = this.processLayerHierarchy(
      hierarchy,
      flatElements,
      counter,
    );
    this.elements = newOrderedElements;
    this.elements.sort((a, b) => a.zDepth - b.zDepth);
    this.selectElementsAt();
    this.update();
  }

  public copyCanvasToClipboard(): void {
    if (!this.workArea.canvas) return;
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
  }

  private handleDropItems(evt: DragEvent | ClipboardEvent): void {
    evt.preventDefault();
    let droppedItems = null;
    if (evt instanceof DragEvent) {
      droppedItems = evt.dataTransfer?.items;
    } else {
      droppedItems = evt.clipboardData?.items;
    }
    if (!droppedItems) return;
    for (const item of droppedItems) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            const imageDataUrl = evt.target?.result as string;
            this.addImageElement(imageDataUrl);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  private handleKeyPress(evt: KeyboardEvent): void {
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
  }

  private changeTool(): void {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === "TEXTAREA" ||
      activeElement?.tagName === "INPUT";
    if (isTyping) return;
    this.eventBus.emit("tool:change", this.currentTool);
  }

  private handleKeyUp(evt: KeyboardEvent): void {
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
  }

  private handleKeyDown(evt: KeyboardEvent): void {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === "TEXTAREA" ||
      activeElement?.tagName === "INPUT";
    if (isTyping) return;

    if (!evt.repeat) {
      if (evt.ctrlKey && evt.code === "KeyC") {
        this.copyCanvasToClipboard();
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
  }

  public removeTransformBox(): void {
    this.transformBox?.removeEvents();
    this.transformBox = null;
  }

  /** Adjust canvas object position to be shown on screen */
  public adjustForScreen(workAreaPosition: Position): Position {
    return {
      x: Math.floor(workAreaPosition.x * this.zoomLevel) + this.offset.x,
      y: Math.floor(workAreaPosition.y * this.zoomLevel) + this.offset.y,
    };
  }

  /** Adjust mouse event position to be shown on canvas */
  public adjustForCanvas(mousePosition: Position): Position {
    return {
      x: Math.floor((mousePosition.x - this.offset.x) / this.zoomLevel),
      y: Math.floor((mousePosition.y - this.offset.y) / this.zoomLevel),
    };
  }

  public static getInstance(eventBus: EventBus): WorkArea {
    if (WorkArea.instance === null) {
      WorkArea.instance = new WorkArea(eventBus);
    }
    return WorkArea.instance;
  }

  private createElementFromData(
    elData: TElementData,
    isChild = false,
  ): Element<TElementData> | null {
    let newElement = null;
    switch (elData.type) {
      case "image":
        newElement = new ImageElement(
          elData.position,
          elData.size,
          elData.zDepth,
        );
        newElement.deserialize(elData);
        requestAnimationFrame(() => requestAnimationFrame(() => this.update()));
        requestAnimationFrame(() => requestAnimationFrame(() => this.update()));
        break;
      case "text":
        newElement = new TextElement(
          elData.position,
          elData.size,
          elData.zDepth,
        );
        newElement.deserialize(elData);
        break;
      case "gradient":
        newElement = new GradientElement(
          elData.position,
          elData.size,
          elData.zDepth,
        );
        newElement.deserialize(elData);
        break;
      case "group":
        newElement = new ElementGroup(
          elData.position,
          elData.size,
          elData.zDepth,
          elData.children
            .map((el) => this.createElementFromData(el, true))
            .filter((el) => el !== null),
        );
        newElement.deserialize(elData);
        break;
      default:
        console.warn(`Unknown element type from data couldn't be parsed.`);
        break;
    }
    if (!isChild && newElement) {
      const payload = {
        elementId: newElement.elementId,
        layerName: newElement.layerName,
        isVisible: newElement.isVisible,
        isLocked: newElement.isLocked,
        type: elData.type,
        children: [] as Layer[],
      };
      if (newElement instanceof ElementGroup && newElement.children) {
        payload.children = newElement?.children.map((child) => ({
          id: child.elementId,
          name: child.layerName,
          isVisible: child.isVisible,
          isLocked: child.isLocked,
        }));
      }
      this.eventBus.emit("workarea:addElement", payload);
    }
    return newElement as Element<TElementData>;
  }

  private createNewProject(projectData: IProjectData): void {
    this.eventBus.emit("workarea:clear");
    this.projectTitle = projectData.title || "";
    this.workArea.canvas.width = projectData.workAreaSize.width;
    this.workArea.canvas.height = projectData.workAreaSize.height;
    this.elements = [];
    this.selectElementsAt();
    this.centerWorkArea();
    this.update();
  }

  public loadProject(data: Partial<IProjectData>): void {
    this.eventBus.emit("workarea:clear");
    this.projectTitle = data?.title || "";
    this.workArea.canvas.width = data?.workAreaSize?.width ?? WORK_AREA_WIDTH;
    this.workArea.canvas.height =
      data?.workAreaSize?.height ?? WORK_AREA_HEIGHT;
    this.elements =
      data?.elements
        ?.map((el) => this.createElementFromData(el))
        .filter((el) => el !== null) ?? [];
    this.selectElementsAt();
    this.centerWorkArea();
    this.update();
  }

  public saveProject(): Partial<IProjectData> {
    const now = new Date().toISOString();
    const projectData = {
      modifyDate: now,
      title: this.projectTitle,
      version: "0.0.1",
      workAreaSize: {
        width: this.workArea.canvas.width,
        height: this.workArea.canvas.height,
      },
      elements: this.elements.map((el) => el.serialize()),
    };
    return projectData;
  }

  public convertCanvasToString(format: string, quality: string): string {
    if (!this.workArea.canvas) {
      console.error("Canvas not found");
      return "";
    }
    const parsedQuality = (Number.parseInt(quality, 10) || 100) / 100;
    return this.workArea.canvas.toDataURL(`image/${format}`, parsedQuality);
  }

  public getSelectedElements(): Element<TElementData>[] {
    const selectedElements: Element<TElementData>[] = [];
    for (const el of this.elements) {
      if (el instanceof ElementGroup) {
        if (el.children?.length) {
          for (const child of el.children) {
            if (child.selected) {
              selectedElements.push(child);
            }
          }
        }
      } else {
        if (el.selected) {
          selectedElements.push(el);
        }
      }
    }
    return selectedElements;
  }

  public selectElementsAt(
    firstPoint?: Position | null,
    secondPoint?: Position | null,
  ): void {
    let selectedElements: Element<TElementData>[] = [];
    if (firstPoint) {
      const adjustedFirstPoint = this.adjustForCanvas(firstPoint);
      const firstElement = this.elements.findLast((el) => {
        if (el instanceof ElementGroup) {
          return (
            el.isVisible &&
            !el.isLocked &&
            el.getBoundingBox().isPointInside(adjustedFirstPoint)
          );
        }
        return (
          el.isVisible &&
          !el.isLocked &&
          el.getBoundingBox().isPointInside(adjustedFirstPoint)
        );
      });
      if (
        firstElement &&
        firstElement instanceof ElementGroup &&
        firstElement.children
      ) {
        selectedElements = firstElement.children;
      } else if (firstElement) {
        selectedElements = [firstElement as Element<TElementData>];
      }
      if (secondPoint) {
        const adjustedSecondPoint = this.adjustForCanvas(secondPoint);
        for (const el of this.elements) {
          if (el instanceof ElementGroup) {
            if (
              el.children?.some(
                (child) =>
                  child.isVisible &&
                  !child.isLocked &&
                  child
                    .getBoundingBox()
                    .isWithinBounds(adjustedFirstPoint, adjustedSecondPoint),
              )
            ) {
              selectedElements = [...selectedElements, ...el.children];
            }
          } else {
            if (
              el.isVisible &&
              !el.isLocked &&
              el
                .getBoundingBox()
                .isWithinBounds(adjustedFirstPoint, adjustedSecondPoint)
            ) {
              selectedElements.push(el);
            }
          }
        }
      }
    }
    this.eventBus.emit("workarea:selectById", {
      elementsId: new Set(selectedElements.map((el) => el.elementId)),
    });
  }

  public createTransformBox(): void {
    this.removeTransformBox();
    const selectedElements: Element<TElementData>[] =
      this.getSelectedElements();
    // If there's elements selected, create TransformBox
    if (selectedElements.length) {
      this.transformBox = new TransformBox(selectedElements, this.eventBus);
    }
  }

  private centerWorkArea(): void {
    if (this.workArea && this.mainCanvas) {
      const workAreaOffset = {
        x: this.mainCanvas.width * 0.5 - this.workArea.canvas.width * this.zoomLevel * 0.5,
        y: this.mainCanvas.height * 0.5 - this.workArea.canvas.height * this.zoomLevel * 0.5,
      };
      this.workArea.offset = workAreaOffset;
    }
  }

  private handleResize(): void {
    if (this.mainCanvas) {
      this.mainCanvas.width =
        window.innerWidth - TOOL_MENU_WIDTH - SIDE_MENU_WIDTH;
      this.mainCanvas.height = window.innerHeight;
      this.centerWorkArea();
      this.update();
    }
  }

  private update(): void {
    if (!this.mainContext || !this.workArea.context || !this.mainCanvas) {
      throw new Error("Canvas context is not available");
    }
    this.clearCanvas();
    for (const element of this.elements) {
      element.draw(this.workArea.context);
    }
    this.drawWorkArea();
    if (this.transformBox) {
      this.transformBox.draw(this.mainContext);
    }
    this.toolManager.draw();
  }

  private clearCanvas(): void {
    if (this.mainContext && this.mainCanvas && this.workArea) {
      this.mainContext.clearRect(
        0,
        0,
        this.mainCanvas.width,
        this.mainCanvas.height,
      );
      this.workArea.context.clearRect(
        0,
        0,
        this.workArea.canvas.width,
        this.workArea.canvas.height,
      );
    }
  }

  private drawWorkArea(): void {
    if (this.mainContext) {
      this.mainContext.save();
      this.mainContext.translate(this.offset.x, this.offset.y);
      this.mainContext.scale(this.zoomLevel, this.zoomLevel);
      this.mainContext.lineWidth = 8;
      this.mainContext.strokeStyle = "black";
      this.mainContext.strokeRect(
        0,
        0,
        this.workArea.canvas.width,
        this.workArea.canvas.height,
      );
      this.mainContext.fillStyle = "white";
      this.mainContext.fillRect(
        0,
        0,
        this.workArea.canvas.width,
        this.workArea.canvas.height,
      );
      this.mainContext.drawImage(this.workArea.canvas, 0, 0);
      this.mainContext.restore();
    }
  }

  public addGradientElement(position?: Position): void {
    const width = this.workArea.canvas.width;
    const height = this.workArea.canvas.height;
    let adjustedPosition = null;
    if (position) {
      adjustedPosition = this.adjustForCanvas(position);
    } else {
      adjustedPosition = {
        x: Math.floor(0.5 * this.workArea.canvas.width) - width,
        y: Math.floor(0.5 * this.workArea.canvas.height) - height,
      };
    }
    const newElement = new GradientElement(
      adjustedPosition,
      { width, height },
      this.elements.length,
    );
    this.elements.push(newElement as Element<TElementData>);
    this.eventBus.emit("workarea:addElement", {
      elementId: newElement.elementId,
      isLocked: newElement.isLocked,
      isVisible: newElement.isVisible,
      layerName: newElement.layerName,
      type: "gradient",
    });
    this.update();
  }

  public addTextElement(position?: Position): void {
    const width = 10;
    const height = 10;
    let adjustedPosition = null;
    if (position) {
      adjustedPosition = this.adjustForCanvas(position);
    } else {
      adjustedPosition = {
        x: Math.floor(0.5 * this.workArea.canvas.width) - width,
        y: Math.floor(0.5 * this.workArea.canvas.height) - height,
      };
    }
    const newElement = new TextElement(
      adjustedPosition,
      { width, height },
      this.elements.length,
    );
    this.elements.push(newElement as Element<TElementData>);
    this.eventBus.emit("workarea:addElement", {
      elementId: newElement.elementId,
      isLocked: newElement.isLocked,
      isVisible: newElement.isVisible,
      layerName: newElement.layerName,
      type: "text",
    });
    this.update();
  }

  public addImageElement(encodedImage: string): void {
    const x = this.workArea.canvas.width * 0.5;
    const y = this.workArea.canvas.height * 0.5;
    const newElement = new ImageElement(
      { x, y },
      { width: 0, height: 0 },
      this.elements.length,
    );
    newElement.loadImage(encodedImage);
    this.elements.push(newElement as Element<TElementData>);
    this.eventBus.emit("workarea:addElement", {
      elementId: newElement.elementId,
      isLocked: newElement.isLocked,
      isVisible: newElement.isVisible,
      layerName: newElement.layerName,
      type: "image",
    });
    this.update();
  }

  public addGroupElement(): void {
    const newElement = new ElementGroup(
      { x: 0, y: 0 },
      { width: 0, height: 0 },
      this.elements.length,
      [],
    );
    this.elements.push(newElement as Element<TElementData>);
    this.eventBus.emit("workarea:addElement", {
      children: [],
      elementId: newElement.elementId,
      isLocked: newElement.isLocked,
      isVisible: newElement.isVisible,
      layerName: newElement.layerName,
      type: "group",
    });
    this.update();
  }
}
