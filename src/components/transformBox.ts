import EVENT from "src/utils/customEvents";
import type { Element } from "src/components/elements/element";
import type { Position, Scale, Size, TElementData } from "src/components/types";
import { WorkArea } from "src/components/workArea";
import { RotateTool } from "./tools/rotateTool";
import { GrabTool } from "./tools/grabTool";
import { ScaleTool } from "./tools/scaleTool";
import { BoundingBox } from "src/utils/boundingBox";
import { Vector } from "src/utils/vector";
import { toRadians } from "src/utils/transforms";

export class TransformBox {
  public position: Position = { x: 0, y: 0 };
  public scale: Scale = { x: 1.0, y: 1.0 };
  public size: Size = { width: 0, height: 0 };
  public anchorPoint: Position | null = null;
  public rotation = 0;

  private selectedElements: Element<TElementData>[] = [];
  private context: CanvasRenderingContext2D | null;
  public boundingBox: BoundingBox | null = null;
  public handles: Record<
    | "BOTTOM"
    | "BOTTOM_LEFT"
    | "BOTTOM_RIGHT"
    | "CENTER"
    | "LEFT"
    | "RIGHT"
    | "TOP"
    | "TOP_LEFT"
    | "TOP_RIGHT",
    Position
  > | null = null;

  public constructor(
    selectedElements: Element<TElementData>[],
    canvas: HTMLCanvasElement,
  ) {
    this.context = canvas.getContext("2d");
    this.selectedElements = selectedElements;
    if (this.selectedElements.length > 0) {
      this.calculateBoundingBox();
    }
  }

  private calculateBoundingBox(): void {
    if (this.selectedElements.length === 1) {
      const element = this.selectedElements[0];
      this.position = { ...element.position };
      this.rotation = element.rotation;
      this.size = { ...element.size };
      this.anchorPoint = { ...this.position };
      this.boundingBox = element.getBoundingBox();
    } else {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      this.selectedElements.forEach((element: Element<TElementData>) => {
        const boundingBox = element.getBoundingBox();

        // Considerando os quatro pontos da BoundingBox
        const corners = [
          boundingBox.topLeft,
          boundingBox.topRight,
          boundingBox.bottomLeft,
          boundingBox.bottomRight,
        ];

        // Atualizando os limites da bounding box que vai circundar todos os elementos
        corners.forEach((corner) => {
          if (corner.x < minX) minX = corner.x;
          if (corner.y < minY) minY = corner.y;
          if (corner.x > maxX) maxX = corner.x;
          if (corner.y > maxY) maxY = corner.y;
        });
      });

      // Calcula a posição e tamanho da TransformBox em torno de todos os elementos
      const width = maxX - minX;
      const height = maxY - minY;

      this.position = { x: minX + width / 2, y: minY + height / 2 };
      this.size = { width, height };
      this.anchorPoint = { ...this.position };

      // Atualiza o boundingBox da TransformBox
      this.boundingBox = new BoundingBox(
        this.position,
        this.size,
        this.rotation,
      );
    }
    // Recalcula os handles
    this.generateHandles();

    // Notifica a aplicação sobre a atualização da TransformBox
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

  private generateHandles(): void {
    if (this.boundingBox) {
      const { center, topLeft, topRight, bottomLeft, bottomRight } =
        this.boundingBox;
      this.handles = {
        TOP_LEFT: new Vector(topLeft),
        TOP: new Vector(topLeft).mid(topRight) as Position,
        TOP_RIGHT: new Vector(topRight),
        RIGHT: new Vector(topRight).mid(bottomRight) as Position,
        BOTTOM_RIGHT: new Vector(bottomRight),
        BOTTOM: new Vector(bottomLeft).mid(bottomRight) as Position,
        BOTTOM_LEFT: new Vector(bottomLeft),
        LEFT: new Vector(bottomLeft).mid(topLeft) as Position,
        CENTER: new Vector(center),
      };
    }
  }

  private rotatePoint(
    point: Position,
    center: Position,
    angle: number,
  ): Position {
    const radians = toRadians(angle);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
      x: cos * dx - sin * dy + center.x,
      y: sin * dx + cos * dy + center.y,
    };
  }

  private updateHandles(): void {
    if (this.boundingBox && this.handles) {
      this.boundingBox.update(this.position, this.size, this.rotation);
      this.generateHandles();
    }
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  public updatePosition({ x, y }: Position): void {
    const delta = { x: x - this.position.x, y: y - this.position.y };
    GrabTool.moveSelectedElements(this.selectedElements, delta);
    this.position = { x, y };
    this.anchorPoint = { ...this.position };

    this.updateHandles();
  }

  public updateRotation(angle: number, anchor: Position = this.position): void {
    this.anchorPoint = anchor;
    const deltaAngle = angle - this.rotation;
    const deltaPos = this.rotatePoint(
      this.position,
      this.anchorPoint,
      deltaAngle,
    );
    RotateTool.rotateSelectedElements(
      this.selectedElements,
      this.anchorPoint,
      deltaAngle,
    );
    this.position = deltaPos;
    this.rotation = angle;

    this.updateHandles();
  }

  public updateScale(delta: Scale, anchor: Position = this.position): void {
    ScaleTool.scaleSelectedElements(
      this.selectedElements,
      anchor,
      delta,
    );
    const newSize = {
      width: this.size.width * delta.x,
      height: this.size.height * delta.y,
    };
    this.size = newSize;

    this.position = {
      x: anchor.x + (this.position.x - anchor.x) * delta.x,
      y: anchor.y + (this.position.y - anchor.y) * delta.y,
    };
    this.anchorPoint = { ...this.position };

    this.updateHandles();
  }

  public contains(element: Element<TElementData>): boolean {
    return !!this.selectedElements.find((el) => el.zDepth === element.zDepth);
  }

  public draw(): void {
    if (!this.context || !this.boundingBox) return;
    const workAreaZoom = WorkArea.getInstance().zoomLevel;
    const workAreaOffset = WorkArea.getInstance().offset;

    // Draw bounding box
    this.context.save();
    this.context.translate(workAreaOffset.x, workAreaOffset.y);
    this.context.scale(workAreaZoom, workAreaZoom);
    const { topLeft, topRight, bottomLeft, bottomRight } = this.boundingBox;

    this.context.strokeStyle = "red";
    this.context.setLineDash([3 / workAreaZoom, 3 / workAreaZoom]);
    this.context.lineWidth = 2 / workAreaZoom;
    this.context.beginPath();
    this.context.moveTo(topLeft.x, topLeft.y);
    this.context.lineTo(topRight.x, topRight.y);
    this.context.lineTo(bottomRight.x, bottomRight.y);
    this.context.lineTo(bottomLeft.x, bottomLeft.y);
    this.context.closePath();
    this.context.stroke();
    // Desenhar os handles
    if (this.handles) {
      Object.keys(this.handles).forEach((handle) => {
        if (this.handles) {
          const point = this.handles[handle as keyof typeof this.handles];
          if (this.context) {
            this.context.fillStyle = "blue";
            this.context.beginPath();
            this.context.arc(
              point.x,
              point.y,
              5 / workAreaZoom,
              0,
              Math.PI * 2,
            );
            this.context.closePath();
            this.context.fill();
          }
        }
      });
    }

    this.context.restore();
  }
}
