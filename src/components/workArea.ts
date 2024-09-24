import { Element } from "./element";
import { SelectTool } from "./tools/selectTool";
import { Tool } from "./tools/abstractTool";
import { TransformBox } from "./transformBox/transformBox";
import {
  BoundingBox,
  IProjectData,
  MouseStatus,
  Position,
  TOOL,
} from "./types";
import { HandTool } from "./tools/handTool";
import { ZoomTool } from "./tools/zoomTool";
import { GrabTool } from "./tools/grabTool";
import { RotateTool } from "./tools/rotateTool";
import { ScaleTool } from "./tools/scaleTool";
import EVENT from "../utils/customEvents";
import getElementById from "../utils/getElementById";

const WORK_AREA_WIDTH = 1920;
const WORK_AREA_HEIGHT = 1080;

interface IWorkAreaProperties {
  context: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  offset: Position;
}

interface IMouseProperties {
  position: Position;
  status: MouseStatus;
}

export class WorkArea {
  private static instance: WorkArea | null = null;
  public mainCanvas?: HTMLCanvasElement;
  public mainContext: CanvasRenderingContext2D | null = null;
  private elements: Element[] = [];
  private _transformBox: TransformBox | null = null;
  private _zoomLevel = 0.3;
  private workArea: IWorkAreaProperties | Record<string, never> = {};
  private _mouse: IMouseProperties = {
    position: { x: 0, y: 0 },
    status: MouseStatus.UP,
  };
  private tools: { [key in TOOL]: Tool };
  public currentTool: TOOL = TOOL.SELECT;

  private constructor() {
    this.createWorkAreaDOMElements();

    if (!this.mainCanvas) throw new Error("Main canvas not available");

    this.tools = {
      [TOOL.SELECT]: new SelectTool(this.mainCanvas),
      [TOOL.GRAB]: new GrabTool(this.mainCanvas),
      [TOOL.HAND]: new HandTool(this.mainCanvas),
      [TOOL.ZOOM]: new ZoomTool(this.mainCanvas),
      [TOOL.SCALE]: new ScaleTool(this.mainCanvas),
      [TOOL.ROTATE]: new RotateTool(this.mainCanvas),
    };
    this.tools[this.currentTool].equipTool();

    const currentMousePosition = {
      x: this.mainCanvas.width * 0.5,
      y: this.mainCanvas.height * 0.5,
    };
    this.mouse = { position: currentMousePosition };

    this.createEventListeners();
    this.update();
  }

  private createWorkAreaDOMElements(): void {
    const mainWindow = getElementById<HTMLDivElement>("main-window");
    this.mainCanvas = document.createElement("canvas");
    this.mainCanvas.id = "main-canvas";
    this.mainCanvas.width = window.innerWidth * 0.7;
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

  public get mouse(): IMouseProperties {
    return this._mouse;
  }

  public set mouse(value: Partial<IMouseProperties>) {
    this._mouse = { ...this.mouse, ...value };
  }

  private createEventListeners(): void {
    if (this.mainCanvas) {
      window.addEventListener("keypress", this.changeTool.bind(this));
      //window.addEventListener("keydown", this.handleKeyDown.bind(this));
      //window.addEventListener("keyup", this.handleKeyUp.bind(this));
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
    }
  }

  private changeTool(event: KeyboardEvent): void {
    if (this.currentTool === TOOL.SELECT) {
      if (this.transformBox) {
        this.tools[this.currentTool].unequipTool();
        switch (event.code) {
          case "KeyG":
            this.currentTool = TOOL.GRAB;
            console.log("GRAB MODE, ACTIVATED!");
            break;
          case "KeyR":
            this.currentTool = TOOL.ROTATE;
            console.log("ROTATE MODE, ACTIVATED!");
            break;
          case "KeyS":
            this.currentTool = TOOL.SCALE;
            console.log("SCALE MODE, ACTIVATED!");
            break;
          case "KeyX":
            this.currentTool = TOOL.SELECT;
            console.log("DELETED!");
            this.removeSelectedElements();
            return;
        }
        this.tools[this.currentTool].equipTool();
      }
    } else {
      this.tools[this.currentTool].unequipTool();
      switch (event.code) {
        case "KeyV":
          this.currentTool = TOOL.SELECT;
          console.log("SELECTING");
          break;
      }
      this.tools[this.currentTool].equipTool();
    }
  }

  //private handlekeyup(event: keyboardevent): void {
  //  if (this.currenttool === tool.zoom || this.currenttool === tool.hand) {
  //    switch (event.code) {
  //      case "keyz":
  //      case "space":
  //        this.tools[this.currenttool].handlekeyup(event);
  //        this.currenttool = tool.select;
  //        console.log("selecting");
  //        return;
  //    }
  //  }
  //}

  //private handlekeydown(event: keyboardevent): void {
  //  if (this.currenttool === tool.select) {
  //    switch (event.code) {
  //      case "space":
  //        this.currenttool = tool.hand;
  //        console.log("moving");
  //        break;
  //      case "keyz":
  //        this.currenttool = tool.zoom;
  //        console.log("zooming");
  //        break;
  //    }
  //    this.tools[this.currenttool].handlekeydown(event);
  //  }
  //}

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

  public adjustForZoom(mousePosition: Position): Position {
    return {
      x: Number(mousePosition.x / this.zoomLevel),
      y: Number(mousePosition.y / this.zoomLevel),
    };
  }

  //private handleMouseDown(event: MouseEvent): void {
  //  this.tools[this.currentTool].handleMouseDown(event);
  //}
  //
  //private handleMouseMove(event: MouseEvent): void {
  //  const { offsetX, offsetY } = event;
  //  this.mouse = { position: { x: offsetX, y: offsetY } };
  //  this.tools[this.currentTool].handleMouseMove(event);
  //}
  //
  //private handleMouseUp(event: MouseEvent): void {
  //  this.tools[this.currentTool].handleMouseUp(event);
  //}

  public static getInstance(): WorkArea {
    if (this.instance === null) {
      this.instance = new WorkArea();
    }
    return this.instance;
  }

  public loadProject(data: string): void {
    window.dispatchEvent(new CustomEvent(EVENT.CLEAR_WORKAREA));
    const projectData: IProjectData = JSON.parse(data);
    this.elements = projectData.elements.map((elData) => {
      const newElement = Element.deserialize(elData);
      window.dispatchEvent(
        new CustomEvent(EVENT.ADD_ELEMENT, {
          detail: {
            elementId: newElement.elementId,
            layerName: newElement.layerName,
          },
        }),
      );
      return newElement;
    });
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

  public getSelectedElements(): Element[] | null {
    return this.elements.filter((el) => el.selected);
  }

  private adjustForWorkAreaCanvas(selection: BoundingBox): BoundingBox {
    const offset = this.workArea.offset;
    const zoomLevel = this.zoomLevel;
    return {
      x1: Math.floor((selection.x1 - offset.x) / zoomLevel),
      y1: Math.floor((selection.y1 - offset.y) / zoomLevel),
      x2: Math.floor((selection.x2 - offset.x) / zoomLevel),
      y2: Math.floor((selection.y2 - offset.y) / zoomLevel),
    };
  }

  public selectElements(selection?: BoundingBox): void {
    let selectedElements: Element[] = [];

    if (selection) {
      const adjustedSelection = this.adjustForWorkAreaCanvas(selection);
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
    const selectedElements: Element[] = this.elements.filter(
      (el) => el.selected,
    );
    // If there's elements selected, create TransformBox
    if (this.mainCanvas && selectedElements.length) {
      this.transformBox = new TransformBox(selectedElements, this.mainCanvas);
    }
  }

  private handleResize(): void {
    if (this.mainCanvas) {
      this.mainCanvas.width = window.innerWidth * 0.7;
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

  public get offset(): Position {
    return this.workArea.offset;
  }
  public set offset(value: Position) {
    this.workArea.offset = value;
  }

  private drawWorkArea(): void {
    if (this.mainContext) {
      this.mainContext.save();
      this.mainContext.translate(this.offset.x, this.offset.y);
      this.mainContext.scale(this.zoomLevel, this.zoomLevel);
      this.mainContext.fillStyle = "white";
      this.mainContext.fillRect(
        0,
        0,
        this.workArea.canvas.width,
        this.workArea.canvas.height,
      );
      this.mainContext.drawImage(this.workArea.canvas, 0, 0);
      this.mainContext.strokeStyle = "black";
      this.mainContext.strokeRect(
        0,
        0,
        this.workArea.canvas.width,
        this.workArea.canvas.height,
      );
      this.mainContext.restore();
    }
  }

  public addElement(): void {
    const width = 50;
    const height = 50;
    const x = Math.floor(Math.random() * this.workArea.canvas.width) - width;
    const y = Math.floor(Math.random() * this.workArea.canvas.height) - height;
    const newElement = new Element(
      { x, y },
      { width, height },
      this.elements.length,
    );
    this.elements.push(newElement);
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

  public addImageElement(filePath: string): void {
    const x = this.workArea.canvas.width * 0.5;
    const y = this.workArea.canvas.height * 0.5;
    const newElement = new Element(
      { x, y },
      { width: 0, height: 0 },
      this.elements.length,
    );
    newElement.loadImage(filePath);
    this.elements.push(newElement);
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
