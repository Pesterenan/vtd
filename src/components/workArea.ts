import type { Element } from "src/components/elements/element";
import { SelectTool } from "src/components/tools/selectTool";
import type { Tool } from "src/components/tools/abstractTool";
import { TransformBox } from "src/components/transformBox";
import type {
  BoundingBox,
  TElementData,
  IProjectData,
  Position,
} from "src/components/types";
import { TOOL } from "src/components/types";
import { HandTool } from "src/components/tools/handTool";
import { ZoomTool } from "src/components/tools/zoomTool";
import { GrabTool } from "src/components/tools/grabTool";
import { RotateTool } from "src/components/tools/rotateTool";
import { ScaleTool } from "src/components/tools/scaleTool";
import EVENT from "src/utils/customEvents";
import getElementById from "src/utils/getElementById";
import { ImageElement } from "src/components/elements/imageElement";
import { TextElement } from "src/components/elements/textElement";
import { TextTool } from "src/components/tools/textTool";
import { GradientTool } from "src/components/tools/gradientTool";
import { GradientElement } from "src/components/elements/gradientElement";
import { FiltersDialog } from "src/components/dialogs/filtersDialog";
import { SIDE_MENU_WIDTH, TOOL_MENU_WIDTH } from "src/constants";

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
  private isUsingTool = false;

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

  private constructor() {
    this.createWorkAreaDOMElements();

    if (!this.mainCanvas) throw new Error("Main canvas not available");

    this.tools = {
      [TOOL.SELECT]: new SelectTool(this.mainCanvas),
      [TOOL.GRADIENT]: new GradientTool(this.mainCanvas),
      [TOOL.GRAB]: new GrabTool(this.mainCanvas),
      [TOOL.HAND]: new HandTool(this.mainCanvas),
      [TOOL.ZOOM]: new ZoomTool(this.mainCanvas),
      [TOOL.SCALE]: new ScaleTool(this.mainCanvas),
      [TOOL.ROTATE]: new RotateTool(this.mainCanvas),
      [TOOL.TEXT]: new TextTool(this.mainCanvas),
    };
    this.tools[this.currentTool].equipTool();

    this.createEventListeners();
    new FiltersDialog();
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

    if (mainWindow) {
      mainWindow.appendChild(this.mainCanvas);
    }
  }

  private createEventListeners(): void {
    if (this.mainCanvas) {
      window.addEventListener(EVENT.CHANGE_TOOL, this.changeTool.bind(this));
      window.addEventListener("keypress", this.handleKeyPress.bind(this));
      window.addEventListener("keydown", this.handleKeyDown.bind(this));
      window.addEventListener("keyup", this.handleKeyUp.bind(this));
      window.addEventListener("resize", this.handleResize.bind(this));

      window.addEventListener(EVENT.UPDATE_WORKAREA, this.update.bind(this));
      window.addEventListener(EVENT.CLEAR_WORKAREA, () => {
        this.removeTransformBox();
        this.elements.length = 0;
      });
      window.addEventListener(EVENT.DELETE_ELEMENT, (evt: Event): void => {
        const customEvent = evt as CustomEvent<{ elementId: number }>;
        const elementId = customEvent.detail.elementId;
        this.elements = this.elements.filter(
          (el) => el.elementId !== elementId,
        );
        this.update();
      });
      window.addEventListener(EVENT.REORGANIZE_LAYERS, (evt: Event) => {
        const customEvent = evt as CustomEvent<{ order: number[] }>;
        const newOrder = customEvent.detail.order;
        newOrder.forEach((id, index) => {
          const element = this.elements.find((el) => el.elementId === id);
          if (element) element.zDepth = index;
        });
        this.elements.sort((a, b) => a.zDepth - b.zDepth);
        this.update();
      });
      window.addEventListener(EVENT.TOGGLE_ELEMENT_VISIBILITY, (evt: Event) => {
        const customEvent = evt as CustomEvent<{
          elementId: number;
          isVisible: boolean;
        }>;
        const { elementId, isVisible } = customEvent.detail;
        const elementToToggleVisibility = this.elements.find(
          (el) => el.elementId === elementId,
        );
        if (elementToToggleVisibility) {
          elementToToggleVisibility.isVisible = isVisible;
        }
        this.update();
      });
      window.addEventListener(EVENT.SELECT_ELEMENT, (evt: Event) => {
        const customEvent = evt as CustomEvent<{ elementsId: Set<number> }>;
        const { elementsId } = customEvent.detail;
        this.elements.forEach((el) => {
          if (elementsId.has(el.elementId)) {
            el.selected = true;
          } else {
            el.selected = false;
          }
        });
        this.createTransformBox();
        this.update();
      });
      window.addEventListener(EVENT.CHANGE_LAYER_NAME, (evt: Event) => {
        const customEvent = evt as CustomEvent<{
          elementId: number;
          name: string;
        }>;
        const { elementId, name } = customEvent.detail;
        const elementToRename = this.elements.find(
          (el) => el.elementId === elementId,
        );
        if (elementToRename) {
          elementToRename.layerName = name;
        }
      });
      this.mainCanvas.addEventListener("dragover", (evt) => {
        evt.preventDefault();
      });
      this.mainCanvas.addEventListener("drop", this.handleDropItems.bind(this));
      window.addEventListener("paste", this.handleDropItems.bind(this));
      window.addEventListener(
        EVENT.USING_TOOL,
        (evt: Event) =>
          (this.isUsingTool = (
            evt as CustomEvent<{
              isUsingTool: boolean;
            }>
          ).detail.isUsingTool),
      );
    }
  }

  public copyCanvasToClipboard(): void {
    if (!this.workArea.canvas) return;
    this.workArea.canvas.toBlob((blob) => {
      if (blob) {
        const item = new ClipboardItem({ "image/png": blob });
        // TODO: Criar um sistema de alerts na aplicação para mostrar que foi copiado.
        navigator.clipboard.write([item]);
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
    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === "TEXTAREA" ||
      activeElement?.tagName === "INPUT";
    if (isTyping || this.isUsingTool) return;

    let toolId = "";
    switch (evt.code) {
      case "KeyV":
        toolId = "select-tool";
        break;
      case "KeyG":
        toolId = "grab-tool";
        break;
      case "KeyR":
        toolId = "rotate-tool";
        break;
      case "KeyS":
        toolId = "scale-tool";
        break;
      case "KeyT":
        toolId = "text-tool";
        break;
      case "KeyH":
        toolId = "gradient-tool";
        break;
      case "KeyX":
        toolId = "select-tool";
        this.removeSelectedElements();
        break;
    }
    if (toolId) {
      window.dispatchEvent(
        new CustomEvent(EVENT.CHANGE_TOOL, {
          detail: {
            toolId,
          },
        }),
      );
    }
  }
  private changeTool(evt: Event): void {
    const customEvent = evt as CustomEvent<{ toolId: string }>;
    const { toolId } = customEvent.detail;

    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === "TEXTAREA" ||
      activeElement?.tagName === "INPUT";
    if (isTyping || this.isUsingTool) return;

    this.tools[this.currentTool].unequipTool();
    switch (toolId) {
      case "select-tool":
        this.currentTool = TOOL.SELECT;
        console.log("SELECTING");
        break;
      case "grab-tool":
        this.currentTool = TOOL.GRAB;
        console.log("GRAB MODE, ACTIVATED!");
        break;
      case "rotate-tool":
        this.currentTool = TOOL.ROTATE;
        console.log("ROTATE MODE, ACTIVATED!");
        break;
      case "scale-tool":
        this.currentTool = TOOL.SCALE;
        console.log("SCALE MODE, ACTIVATED!");
        break;
      case "text-tool":
        this.currentTool = TOOL.TEXT;
        console.log("TEXT MODE, ACTIVATED!");
        break;
      case "gradient-tool":
        this.currentTool = TOOL.GRADIENT;
        console.log("GRADIENT MODE, ACTIVATED!");
        break;
      case "hand-tool":
        this.currentTool = TOOL.HAND;
        console.log("MOVING CANVAS MODE, ACTIVATED!");
        break;
      case "zoom-tool":
        this.currentTool = TOOL.ZOOM;
        console.log("ZOOMING MODE, ACTIVATED!");
        break;
    }
    this.tools[this.currentTool].equipTool();
  }

  private handleKeyUp(evt: KeyboardEvent): void {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === "TEXTAREA" ||
      activeElement?.tagName === "INPUT";
    if (isTyping || this.isUsingTool) return;

    if (this.currentTool === TOOL.ZOOM || this.currentTool === TOOL.HAND) {
      switch (evt.code) {
        case "Space":
        case "KeyZ":
          window.dispatchEvent(
            new CustomEvent(EVENT.CHANGE_TOOL, {
              detail: {
                toolId: "select-tool",
              },
            }),
          );
      }
    }
  }

  private handleKeyDown(evt: KeyboardEvent): void {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === "TEXTAREA" ||
      activeElement?.tagName === "INPUT";
    if (isTyping || this.isUsingTool) return;

    if (evt.ctrlKey && evt.code === "KeyC") {
      this.copyCanvasToClipboard();
    }

    let toolId = "";
    switch (evt.code) {
      case "Space":
        toolId = 'hand-tool';
        break;
      case "KeyZ":
        toolId = 'zoom-tool';
        break;
    }
    if (toolId) {
      window.dispatchEvent(
        new CustomEvent(EVENT.CHANGE_TOOL, {
          detail: {
            toolId,
          },
        }),
      );
    }
  }

  public removeTransformBox(): void {
    if (this.transformBox) {
      this.transformBox.remove();
      this.transformBox = null;
    }
  }

  private removeSelectedElements(): void {
    if (this.transformBox) {
      const idsToRemove = this.getSelectedElements()?.map((el) => el.elementId);
      if (idsToRemove) {
        idsToRemove.forEach((elementId) =>
          window.dispatchEvent(
            new CustomEvent(EVENT.DELETE_ELEMENT, { detail: { elementId } }),
          ),
        );
      }
      this.removeTransformBox();
      this.update();
    }
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

  /** Adjust selection boundingbox to be shown on canvas */
  private adjustSelectionForCanvas(selection: BoundingBox): BoundingBox {
    return {
      x1: Math.floor((selection.x1 - this.workArea.offset.x) / this.zoomLevel),
      y1: Math.floor((selection.y1 - this.workArea.offset.y) / this.zoomLevel),
      x2: Math.floor((selection.x2 - this.workArea.offset.x) / this.zoomLevel),
      y2: Math.floor((selection.y2 - this.workArea.offset.y) / this.zoomLevel),
    };
  }

  public static getInstance(): WorkArea {
    if (this.instance === null) {
      this.instance = new WorkArea();
    }
    return this.instance;
  }

  private createElementFromData(
    elData: TElementData,
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
      default:
        console.warn(`Unknown element type from data couldn't be parsed.`);
        break;
    }
    if (newElement) {
      window.dispatchEvent(
        new CustomEvent(EVENT.ADD_ELEMENT, {
          detail: {
            elementId: newElement.elementId,
            layerName: newElement.layerName,
          },
        }),
      );
    }
    return newElement as Element<TElementData>;
  }

  public loadProject(data: string): void {
    window.dispatchEvent(new CustomEvent(EVENT.CLEAR_WORKAREA));
    const projectData: IProjectData = JSON.parse(data);
    this.elements = projectData.elements
      .map(this.createElementFromData)
      .filter((el) => el !== null);
    this.selectElements();
    this.update();
  }

  public saveProject(): string {
    const projectData = {
      elements: this.elements.map((el) => el.serialize()),
    };
    return JSON.stringify(projectData);
  }

  public exportCanvas(): string {
    console.log("exporting canvas");
    if (!this.workArea.canvas) {
      console.error("Canvas not found");
      return "";
    }
    console.log(this.workArea.canvas.toDataURL("image/png"));
    return this.workArea.canvas.toDataURL("image/png");
  }

  public getSelectedElements(): Element<TElementData>[] | null {
    return this.elements.filter((el) => el.selected);
  }

  public selectElements(selection?: BoundingBox): void {
    let selectedElements: Element<TElementData>[] = [];

    if (selection) {
      const adjustedSelection = this.adjustSelectionForCanvas(selection);
      if (selection.x1 === selection.x2 && selection.y1 === selection.y2) {
        const firstElement = this.elements.findLast(
          (el) => el.isVisible && el.isBelowSelection(adjustedSelection),
        );
        if (firstElement) {
          selectedElements = [firstElement];
        }
      } else {
        selectedElements = this.elements.filter(
          (el) => el.isVisible && el.isWithinBounds(adjustedSelection),
        );
      }
    }

    window.dispatchEvent(
      new CustomEvent(EVENT.SELECT_ELEMENT, {
        detail: {
          elementsId: new Set(selectedElements.map((el) => el.elementId)),
        },
      }),
    );
  }

  public createTransformBox(): void {
    this.removeTransformBox();
    const selectedElements: Element<TElementData>[] = this.elements.filter(
      (el) => el.selected,
    );
    // If there's elements selected, create TransformBox
    if (this.mainCanvas && selectedElements.length) {
      this.transformBox = new TransformBox(selectedElements, this.mainCanvas);
    }
  }

  private handleResize(): void {
    if (this.mainCanvas) {
      this.mainCanvas.width =
        window.innerWidth - TOOL_MENU_WIDTH - SIDE_MENU_WIDTH;
      this.mainCanvas.height = window.innerHeight;
      this.update();
    }
  }

  private update(): void {
    if (!this.mainContext || !this.workArea.context || !this.mainCanvas) {
      throw new Error("Canvas context is not available");
    }
    this.clearCanvas(this.mainContext, this.mainCanvas);
    this.clearCanvas(this.workArea.context, this.workArea.canvas);
    for (const element of this.elements) {
      element.draw(this.workArea.context);
    }
    this.drawWorkArea();
    if (this.transformBox) {
      this.transformBox.draw();
    }
    this.tools[this.currentTool].draw();
  }

  private clearCanvas(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ): void {
    context.clearRect(0, 0, canvas.width, canvas.height);
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

  public addGradientElement(): void {
    const width = this.workArea.canvas.width;
    const height = this.workArea.canvas.height;
    const newElement = new GradientElement(
      { x: width * 0.5, y: height * 0.5 },
      { width, height },
      this.elements.length,
    );
    this.elements.push(newElement as Element<TElementData>);
    window.dispatchEvent(
      new CustomEvent(EVENT.ADD_ELEMENT, {
        detail: {
          elementId: newElement.elementId,
          layerName: newElement.layerName,
        },
      }),
    );
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
        x: Math.floor(Math.random() * this.workArea.canvas.width) - width,
        y: Math.floor(Math.random() * this.workArea.canvas.height) - height,
      };
    }
    const newElement = new TextElement(
      adjustedPosition,
      { width, height },
      this.elements.length,
    );
    this.elements.push(newElement as Element<TElementData>);
    window.dispatchEvent(
      new CustomEvent(EVENT.ADD_ELEMENT, {
        detail: {
          elementId: newElement.elementId,
          layerName: newElement.layerName,
        },
      }),
    );
    this.update();
  }

  public addElement(): void {
    const width = 50;
    const height = 50;
    const x = Math.floor(Math.random() * this.workArea.canvas.width) - width;
    const y = Math.floor(Math.random() * this.workArea.canvas.height) - height;
    const newElement = new ImageElement(
      { x, y },
      { width, height },
      this.elements.length,
    );
    this.elements.push(newElement as Element<TElementData>);
    window.dispatchEvent(
      new CustomEvent(EVENT.ADD_ELEMENT, {
        detail: {
          elementId: newElement.elementId,
          layerName: newElement.layerName,
        },
      }),
    );
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
    window.dispatchEvent(
      new CustomEvent(EVENT.ADD_ELEMENT, {
        detail: {
          elementId: newElement.elementId,
          layerName: newElement.layerName,
        },
      }),
    );
  }
}
