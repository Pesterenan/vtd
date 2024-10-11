import EVENT from "src/utils/customEvents";
import type { Element } from "src/components/elements/element";
import { GrabTool } from "src/components/tools/grabTool";
import type {
  BoundingBox,
  Position,
  Size,
  TElementData,
} from "src/components/types";
import { WorkArea } from "src/components/workArea";
import { ScaleTool } from "./tools/scaleTool";

export class TransformBox {
  public position: Position = { x: 0, y: 0 };
  public size: Size = { width: 0, height: 0 };
  private selectedElements: Element<TElementData>[] = [];
  public isHandleDragging = false;
  private context: CanvasRenderingContext2D | null;
  public centerHandle: HTMLImageElement | null = null;
  public boundingBox: BoundingBox | null = null;
  private rotation = 0;

  public constructor(
    selectedElements: Element<TElementData>[],
    canvas: HTMLCanvasElement,
  ) {
    this.context = canvas.getContext("2d");
    this.selectedElements = selectedElements;
    this.recalculateBoundingBox();
  }

  public updateTransformBoxPosition({ x, y }: Position): void {
    const center = this.getCenter();
    const delta = { x: x - center.x, y: y - center.y };
    this.position.x = x;
    this.position.y = y;
    GrabTool.moveSelectedElements(
      WorkArea.getInstance().getSelectedElements(),
      delta,
    );
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  public updateTransformBoxSize({ width, height }: Size): void {
    //this.size.width = width;
    //this.size.height = height;
    this.recalculateBoundingBox();
    ScaleTool.scaleSelectedElements(
      WorkArea.getInstance().getSelectedElements(),
      this.getCenter(),
      { x: 1, y: 1 },
    );

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
    this.context.translate(this.getCenter().x, this.getCenter().y);
    this.context.rotate(this.rotation * (Math.PI / 180));
    this.context.translate(-this.getCenter().x, -this.getCenter().y);

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
  public remove(): void {}
}
