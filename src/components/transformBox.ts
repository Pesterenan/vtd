import EVENT from "src/utils/customEvents";
import type { Element } from "src/components/elements/element";
import type {
  BoundingBox,
  Position,
  Scale,
  Size,
  TElementData,
} from "src/components/types";
import { WorkArea } from "src/components/workArea";
import { RotateTool } from "./tools/rotateTool";
import { GrabTool } from "./tools/grabTool";

export class TransformBox {
  public position: Position = { x: 0, y: 0 };
  public scale: Scale = { x: 1.0, y: 1.0 };
  public size: Size = { width: 0, height: 0 };
  public anchorPoint: Position | null = null;
  public rotation = 0;

  private selectedElements: Element<TElementData>[] = [];
  private context: CanvasRenderingContext2D | null;
  public boundingBox: BoundingBox | null = null;

  public constructor(
    selectedElements: Element<TElementData>[],
    canvas: HTMLCanvasElement,
  ) {
    this.context = canvas.getContext("2d");
    this.selectedElements = selectedElements;
    this.recalculateBoundingBox();
  }

  public updatePosition({ x, y }: Position): void {
    const delta = { x: x - this.position.x, y: y - this.position.y };
    GrabTool.moveSelectedElements(this.selectedElements, delta);
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  public updateScale(): void {
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  public updateRotation(newValue: number, origin?: Position): void {
    const delta = newValue - this.rotation;
    RotateTool.rotateSelectedElements(
      this.selectedElements,
      origin ? origin : this.position,
      delta,
    );
    this.rotation = newValue;
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

    // Calcula a posição como o centro
    const width = maxX - minX;
    const height = maxY - minY;
    this.position = { x: minX + width / 2, y: minY + height / 2 };
    this.anchorPoint ??= {...this.position};
    this.size = { width, height };
    this.boundingBox = {
      x1: this.position.x - width / 2,
      y1: this.position.y - height / 2,
      x2: this.position.x + width / 2,
      y2: this.position.y + height / 2,
    };
    window.dispatchEvent(
      new CustomEvent(EVENT.RECALCULATE_TRANSFORM_BOX, {
        detail: {
          position: this.position,
          size: this.size,
          rotation: this.rotation,
        },
      }),
    );
  }

  /** Returns the center of the transform box */
  public getCenter(): Position {
    return this.position;
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
    this.context.translate(this.position.x, this.position.y);
    this.context.rotate(this.rotation * (Math.PI / 180));
    this.context.translate(-this.position.x, -this.position.y);

    this.context.strokeStyle = "red";
    this.context.setLineDash([3 / workAreaZoom, 3 / workAreaZoom]);
    this.context.lineWidth = 2 / workAreaZoom;
    this.context.strokeRect(
      this.position.x - this.size.width / 2,
      this.position.y - this.size.height / 2,
      this.size.width,
      this.size.height,
    );

    this.context.restore();
  }
}
