import EVENT from "../../utils/customEvents";
import getElementById from "../../utils/getElementById";
import { Element } from "../elements/element";
import { GrabTool } from "../tools/grabTool";
import { BoundingBox, Position, Size, TElementData } from "../types";
import { WorkArea } from "../workArea";

export class TransformBox {
  private position: Position = { x: 0, y: 0 };
  private size: Size = { width: 0, height: 0 };
  private selectedElements: Element<TElementData>[] = [];
  public isHandleDragging = false;
  private context: CanvasRenderingContext2D | null;
  public centerHandle: HTMLImageElement | null = null;
  public boundingBox: BoundingBox | null = null;

  private xPosInput: {
    element: HTMLInputElement;
    listener: (event: Event) => void;
  };
  private yPosInput: {
    element: HTMLInputElement;
    listener: (event: Event) => void;
  };
  private widthSizeInput: {
    element: HTMLInputElement;
    listener: (event: Event) => void;
  };
  private heightSizeInput: {
    element: HTMLInputElement;
    listener: (event: Event) => void;
  };

  public constructor(
    selectedElements: Element<TElementData>[],
    canvas: HTMLCanvasElement,
  ) {
    this.context = canvas.getContext("2d");
    this.selectedElements = selectedElements;
    this.recalculateBoundingBox();

    this.xPosInput = {
      element: getElementById<HTMLInputElement>("x-pos-input"),
      listener: this.updateTransformBoxPosition.bind(this),
    };
    this.yPosInput = {
      element: getElementById<HTMLInputElement>("y-pos-input"),
      listener: this.updateTransformBoxPosition.bind(this),
    };
    this.widthSizeInput = {
      element: getElementById<HTMLInputElement>("width-size-input"),
      listener: this.updateTransformBoxSize.bind(this),
    };
    this.heightSizeInput = {
      element: getElementById<HTMLInputElement>("height-size-input"),
      listener: this.updateTransformBoxSize.bind(this),
    };

    this.createEventListeners();
  }

  private createEventListeners(): void {
    this.xPosInput.element.addEventListener("input", this.xPosInput.listener);
    this.yPosInput.element.addEventListener("input", this.yPosInput.listener);
    this.widthSizeInput.element.addEventListener(
      "input",
      this.widthSizeInput.listener,
    );
    this.heightSizeInput.element.addEventListener(
      "input",
      this.heightSizeInput.listener,
    );
  }

  private removeEventListeners(): void {
    this.xPosInput.element.removeEventListener(
      "input",
      this.xPosInput.listener,
    );
    this.yPosInput.element.removeEventListener(
      "input",
      this.yPosInput.listener,
    );
    this.widthSizeInput.element.removeEventListener(
      "input",
      this.widthSizeInput.listener,
    );
    this.heightSizeInput.element.removeEventListener(
      "input",
      this.heightSizeInput.listener,
    );
  }

  private updateTransformBoxPosition(): void {
    const center = this.getCenter();
    const delta = {
      x: parseFloat(this.xPosInput.element.value) - center.x,
      y: parseFloat(this.yPosInput.element.value) - center.y,
    };
    this.position.x += delta.x;
    this.position.y += delta.y;
    GrabTool.moveSelectedElements(
      WorkArea.getInstance().getSelectedElements(),
      delta,
    );
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  private updateTransformBoxSize(): void {
    this.size.width = parseFloat(this.widthSizeInput.element.value);
    this.size.height = parseFloat(this.heightSizeInput.element.value);
    // TODO: Work on correctly scaling objects via the properties panel
    //const delta = {
    //  x: parseFloat(this.widthSizeInput.element.value) - this.size.width,
    //  y: parseFloat(this.heightSizeInput.element.value) - this.size.height
    //};
    //console.log(delta, 'delta scale');
    //ScaleTool.scaleSelectedElements(
    //  WorkArea.getInstance().getSelectedElements(),
    //  this.position,
    //  delta
    //);
    //const deltaY = event.offsetY - this.lastPosition.y;
    //const deltaX = event.offsetX - this.lastPosition.x;
    //const delta = { x: 1 + deltaX / 100, y: 1 + deltaY / 100 };
    //ScaleTool.scaleSelectedElements(this.selectedElements, this.centerPosition, delta);
    //this.lastPosition = {
    //  x: event.offsetX,
    //  y: event.offsetY
    //};
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  public contains(element: Element<TElementData>): boolean {
    return !!this.selectedElements.find((el) => el.zDepth === element.zDepth);
  }

  private recalculateBoundingBox(): void {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    this.selectedElements.forEach((element: Element<TElementData>) => {
      const boundingBox = element.getTransformedBoundingBox();
      if (boundingBox.x1 < minX) minX = boundingBox.x1;
      if (boundingBox.y1 < minY) minY = boundingBox.y1;
      if (boundingBox.x2 > maxX) maxX = boundingBox.x2;
      if (boundingBox.y2 > maxY) maxY = boundingBox.y2;
    });

    this.position = { x: minX, y: minY };
    this.size = { width: maxX - minX, height: maxY - minY };
    this.boundingBox = {
      x1: this.position.x,
      y1: this.position.y,
      x2: this.size.width,
      y2: this.size.height,
    };
    window.dispatchEvent(
      new CustomEvent(EVENT.RECALCULATE_TRANSFORM_BOX, {
        detail: { position: this.getCenter(), size: this.size },
      }),
    );
  }

  /** Returns the center of the transform box */
  public getCenter(): Position {
    return {
      x: this.position.x + this.size.width * 0.5,
      y: this.position.y + this.size.height * 0.5,
    };
  }

  public draw(): void {
    if (!this.context) return;
    this.recalculateBoundingBox();
    const workAreaZoom = WorkArea.getInstance().zoomLevel;
    const workAreaOffset = WorkArea.getInstance().offset;

    // Draw bounding box
    this.context.save();
    this.context.translate(workAreaOffset.x, workAreaOffset.y);
    this.context.scale(workAreaZoom, workAreaZoom);
    //
    // this.context.translate(centerPos.x, centerPos.y)
    // this.context.rotate(this.rotation * (Math.PI / 180))
    // this.context.translate(-centerPos.x, -centerPos.y)

    this.context.strokeStyle = "red";
    this.context.setLineDash([3 / workAreaZoom, 3 / workAreaZoom]);
    this.context.lineWidth = 2 / workAreaZoom;
    this.context.strokeRect(
      this.position.x,
      this.position.y,
      this.size.width,
      this.size.height,
    );

    this.context.restore();
  }

  public remove(): void {
    this.removeEventListeners();
  }
}
