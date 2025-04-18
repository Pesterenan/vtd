import type { Element } from "src/components/elements/element";
import { SelectTool } from "src/components/tools/selectTool";
import type { Tool } from "src/components/tools/abstractTool";
import { TransformBox } from "src/components/transformBox";
import type {
  TElementData,
  IProjectData,
  Position,
  Layer,
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
import { DialogExportImage } from "src/components/dialogs/DialogExportImage";
import { SIDE_MENU_WIDTH, TOOL_MENU_WIDTH } from "src/constants";
import { ElementGroup } from "./elements/elementGroup";

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
  private isUsingTool = false;
  private devCanvas: HTMLCanvasElement | null = null;

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

    this.createElementFromData = this.createElementFromData.bind(this);
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
    new DialogExportImage();
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

    const devCanvas = document.createElement("canvas");
    devCanvas.width = WORK_AREA_WIDTH;
    devCanvas.height = WORK_AREA_HEIGHT;
    devCanvas.style.backgroundColor = "white";
    this.devCanvas = devCanvas;

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
      window.addEventListener(EVENT.DELETE_ELEMENT, () => {
        this.removeTransformBox();
        this.update();
      });
      window.addEventListener(
        EVENT.REORGANIZE_LAYERS,
        this.handleReorganizeLayers.bind(this),
      );
      window.addEventListener(
        EVENT.TOGGLE_ELEMENT_LOCK,
        this.handleToggleLock.bind(this),
      );
      window.addEventListener(EVENT.TOGGLE_ELEMENT_VISIBILITY, (evt: Event) => {
        const customEvent = evt as CustomEvent<{
          elementId: number;
          isVisible: boolean;
        }>;
        const { elementId, isVisible } = customEvent.detail;
        const flatElements = this.getFlatElements(this.elements);
        const elementToToggleVisibility = flatElements.find(
          (el) => el.elementId === elementId,
        );
        if (elementToToggleVisibility) {
          elementToToggleVisibility.isVisible = isVisible;
        }
        this.update();
      });
      window.addEventListener(
        EVENT.SELECT_ELEMENT,
        this.handleSelectElement.bind(this),
      );
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

  private handleSelectElement(evt: Event): void {
    const customEvent = evt as CustomEvent<{ elementsId: Set<number> }>;
    const { elementsId } = customEvent.detail;
    const selectElement = (element: Element<TElementData>) =>
      (element.selected =
        elementsId.has(element.elementId) && !element.isLocked);
    this.elements.forEach((el) => {
      if (el instanceof ElementGroup && el.children && !el.isLocked) {
        el.children.forEach(selectElement);
      } else {
        selectElement(el);
      }
    });
    this.createTransformBox();
    this.update();
  }

  private getFlatElements(
    elements: Element<TElementData>[],
  ): Element<TElementData>[] {
    const flatElements: Element<TElementData>[] = [];
    elements.forEach((el) => {
      flatElements.push(el);
      if (el instanceof ElementGroup && el.children) {
        flatElements.push(...this.getFlatElements(el.children));
      }
    });
    return flatElements;
  }

  private processLayerHierarchy(
    hierarchy: Layer[],
    flatElements: Element<TElementData>[],
    counter: { value: number },
  ): Element<TElementData>[] {
    const orderedElements: Element<TElementData>[] = [];
    hierarchy.forEach((node) => {
      const element = flatElements.find((el) => el.elementId === node.id);
      if (element) {
        element.zDepth = counter.value++;
        orderedElements.push(element);
        if (node.children && element instanceof ElementGroup) {
          const childElements = this.processLayerHierarchy(
            node.children,
            flatElements,
            counter,
          );
          (element as ElementGroup).children = childElements;
        }
      }
    });
    return orderedElements;
  }

  private handleToggleLock(evt: Event): void {
    const customEvent = evt as CustomEvent<{
      elementId: number;
      isLocked: boolean;
    }>;
    const { elementId, isLocked } = customEvent.detail;
    const flatElements = this.getFlatElements(this.elements);
    const elementToToggleLock = flatElements.find(
      (el) => el.elementId === elementId,
    );
    if (elementToToggleLock) {
      if (elementToToggleLock instanceof ElementGroup) {
        elementToToggleLock.children?.forEach(
          (child) => (child.selected = false),
        );
      }
      elementToToggleLock.isLocked = isLocked;
    }
    this.selectElements();
    this.update();
  }

  private handleReorganizeLayers(evt: Event): void {
    const customEvent = evt as CustomEvent<{ hierarchy: Layer[] }>;
    const newHierarchy = customEvent.detail.hierarchy;

    const flatElements = this.getFlatElements(this.elements);

    const counter = { value: 0 };

    const newOrderedElements = this.processLayerHierarchy(
      newHierarchy,
      flatElements,
      counter,
    );
    this.elements = newOrderedElements;
    this.elements.sort((a, b) => a.zDepth - b.zDepth);
    this.update();
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

    let tool = "";
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
      window.dispatchEvent(
        new CustomEvent(EVENT.CHANGE_TOOL, {
          detail: {
            tool,
          },
        }),
      );
    }
  }
  private changeTool(evt: Event): void {
    const customEvent = evt as CustomEvent<{ tool: string }>;
    const { tool } = customEvent.detail;

    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === "TEXTAREA" ||
      activeElement?.tagName === "INPUT";
    if (isTyping || this.isUsingTool) return;

    this.tools[this.currentTool].unequipTool();
    this.currentTool = tool as TOOL;
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
                tool: this.lastTool ? this.lastTool : TOOL.SELECT,
              },
            }),
          );
      }
    }
  }

  private handleKeyDown(evt: KeyboardEvent): void {
    if (!evt.repeat) {
      const activeElement = document.activeElement;
      const isTyping =
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.tagName === "INPUT";
      if (isTyping || this.isUsingTool) return;

      if (evt.ctrlKey && evt.code === "KeyC") {
        this.copyCanvasToClipboard();
      }

      let tool = "";
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
        window.dispatchEvent(
          new CustomEvent(EVENT.CHANGE_TOOL, {
            detail: {
              tool,
            },
          }),
        );
      }
    }
  }

  public removeTransformBox(): void {
    if (this.transformBox) {
      this.transformBox = null;
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

  public static getInstance(): WorkArea {
    if (this.instance === null) {
      this.instance = new WorkArea();
    }
    return this.instance;
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
      const eventDetail = {
        detail: {
          elementId: newElement.elementId,
          layerName: newElement.layerName,
          isVisible: newElement.isVisible,
          isLocked: newElement.isLocked,
          type: elData.type,
          children: [] as {
            id: number;
            name: string;
            isVisible: boolean;
            isLocked: boolean;
          }[],
        },
      };
      if (newElement instanceof ElementGroup && newElement.children) {
        eventDetail.detail.children = newElement?.children.map((child) => ({
          id: child.elementId,
          name: child.layerName,
          isVisible: child.isVisible,
          isLocked: child.isLocked,
        }));
      }
      window.dispatchEvent(new CustomEvent(EVENT.ADD_ELEMENT, eventDetail));
    }
    return newElement as Element<TElementData>;
  }

  public loadProject(data: string): void {
    window.dispatchEvent(new CustomEvent(EVENT.CLEAR_WORKAREA));
    const projectData: IProjectData = JSON.parse(data);
    this.elements = projectData.elements
      .map((el) => this.createElementFromData(el))
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

  public exportCanvas(format: string, quality: string): string {
    if (!this.workArea.canvas) {
      console.error("Canvas not found");
      return "";
    }
    const parsedQuality = (parseInt(quality, 10) || 100) / 100;
    return this.workArea.canvas.toDataURL(`image/${format}`, parsedQuality);
  }

  public getSelectedElements(): Element<TElementData>[] {
    const selectedElements: Element<TElementData>[] = [];
    this.elements.forEach((el) => {
      if (el instanceof ElementGroup && el.children && el.children.length) {
        return el.children.forEach(
          (child) => child.selected && selectedElements.push(child),
        );
      } else {
        return el.selected && selectedElements.push(el);
      }
    });
    return selectedElements;
  }

  public selectElements(
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
        this.elements.forEach((el) => {
          if (el instanceof ElementGroup) {
            if (
              el.children &&
              el.children.some(
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
        });
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

  public drawbox(a: Position, b: Position): void {
    if (this.devCanvas) {
      const context = this.devCanvas.getContext("2d");
      if (context) {
        context.globalAlpha = 0.2;
        context.save();
        context.lineWidth = 4;
        context.strokeStyle = "green";
        context.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        context.restore();
      }
    }
  }

  public createTransformBox(): void {
    this.removeTransformBox();
    const selectedElements: Element<TElementData>[] =
      this.getSelectedElements();
    // If there's elements selected, create TransformBox
    if (this.mainCanvas && selectedElements) {
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
      if (this.devCanvas) {
        this.mainContext.drawImage(this.devCanvas, 0, 0);
      }
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
          isLocked: newElement.isLocked,
          isVisible: newElement.isVisible,
          layerName: newElement.layerName,
          type: "gradient",
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
    window.dispatchEvent(
      new CustomEvent(EVENT.ADD_ELEMENT, {
        detail: {
          elementId: newElement.elementId,
          isLocked: newElement.isLocked,
          isVisible: newElement.isVisible,
          layerName: newElement.layerName,
          type: "text",
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
          isLocked: newElement.isLocked,
          isVisible: newElement.isVisible,
          layerName: newElement.layerName,
          type: "image",
        },
      }),
    );
  }

  public addGroupElement(): void {
    const newElement = new ElementGroup(
      { x: 0, y: 0 },
      { width: 0, height: 0 },
      this.elements.length,
      [],
    );
    this.elements.push(newElement as Element<TElementData>);
    window.dispatchEvent(
      new CustomEvent(EVENT.ADD_ELEMENT, {
        detail: {
          elementId: newElement.elementId,
          isLocked: newElement.isLocked,
          isVisible: newElement.isVisible,
          layerName: newElement.layerName,
          type: "group",
        },
      }),
    );
    this.update();
  }
}
