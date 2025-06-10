import type { Element } from "src/components/elements/element";
import type { Position, Scale, Size, TElementData } from "src/components/types";
import { WorkArea } from "src/components/workArea";
import { BoundingBox } from "src/utils/boundingBox";
import EVENT, { dispatch } from "src/utils/customEvents";
import { toRadians } from "src/utils/transforms";
import { Vector } from "src/utils/vector";
import { ElementGroup } from "./elements/elementGroup";

export class TransformBox {
  public position: Position = { x: 0, y: 0 };
  public scale: Scale = { x: 1.0, y: 1.0 };
  public size: Size = { width: 0, height: 0 };
  public anchorPoint: Position | null = null;
  public rotation = 0;
  public opacity = 1;

  private selectedElements: Element<TElementData>[] = [];
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

  public constructor(selectedElements: Element<TElementData>[]) {
    this.selectedElements = selectedElements;
    if (this.selectedElements.length > 0) {
      this.calculateBoundingBox();
    }
  }

  private calculateBoundingBox(): void {
    if (this.selectedElements.length === 1) {
      const element = this.selectedElements[0];
      this.boundingBox = element.getBoundingBox();
      this.position = { ...element.position };
      this.rotation = element.rotation;
      this.opacity = element.opacity;
      const scaledSize = {
        width: element.size.width * element.scale.x,
        height: element.size.height * element.scale.y,
      };
      this.size = scaledSize;
      this.anchorPoint = { ...this.position };
    } else {
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      for (const element of this.selectedElements) {
        const boundingBox = element.getBoundingBox();

        // Considerando os quatro pontos da BoundingBox
        const corners = [
          boundingBox.topLeft,
          boundingBox.topRight,
          boundingBox.bottomLeft,
          boundingBox.bottomRight,
        ];

        // Atualizando os limites da bounding box que vai circundar todos os elementos
        for (const corner of corners) {
          if (corner.x < minX) minX = corner.x;
          if (corner.y < minY) minY = corner.y;
          if (corner.x > maxX) maxX = corner.x;
          if (corner.y > maxY) maxY = corner.y;
        }
      }

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
    this.updateHandles();
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
    dispatch(EVENT.RECALCULATE_TRANSFORM_BOX, {
      position: this.position,
      size: this.size,
      rotation: this.rotation,
      opacity: this.opacity,
    });
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  public updateOpacity(opacity: number): void {
    for (const element of this.selectedElements) {
      element.opacity = opacity;
    }
    this.opacity = opacity;
    this.updateHandles();
  }

  public updatePosition({ x, y }: Position): void {
    const delta = { x: x - this.position.x, y: y - this.position.y };
    const moveElement = (element: Element<TElementData>) => {
      element.position = {
        x: element.position.x + delta.x,
        y: element.position.y + delta.y,
      };
    };
    if (this.selectedElements) {
      for (const element of this.selectedElements) {
        if (element instanceof ElementGroup) {
          element.children?.forEach(moveElement);
        } else {
          moveElement(element);
        }
      }
    }
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
    const angleInRadians = toRadians(deltaAngle);
    const rotateElement = (element: Element<TElementData>) => {
      if (this.anchorPoint) {
        const deltaX = element.position.x - this.anchorPoint.x;
        const deltaY = element.position.y - this.anchorPoint.y;
        const newX =
          deltaX * Math.cos(angleInRadians) - deltaY * Math.sin(angleInRadians);
        const newY =
          deltaX * Math.sin(angleInRadians) + deltaY * Math.cos(angleInRadians);
        element.position = {
          x: this.anchorPoint.x + newX,
          y: this.anchorPoint.y + newY,
        };
        element.rotation += deltaAngle;
      }
    };
    if (this.selectedElements) {
      for (const element of this.selectedElements) {
        if (element instanceof ElementGroup) {
          element.children?.forEach(rotateElement);
        } else {
          rotateElement(element);
        }
      }
    }
    this.position = deltaPos;
    this.rotation = angle;
    this.updateHandles();
  }

  public updateScale(delta: Scale, anchor: Position = this.position): void {
    this.anchorPoint = anchor;
    const scaleElement = (element: Element<TElementData>) => {
      element.scale = {
        x: element.scale.x * delta.x,
        y: element.scale.y * delta.y,
      };
      element.position = {
        x: anchor.x + (element.position.x - anchor.x) * delta.x,
        y: anchor.y + (element.position.y - anchor.y) * delta.y,
      };
    };
    if (this.selectedElements) {
      for (const element of this.selectedElements) {
        if (element instanceof ElementGroup) {
          element.children?.forEach(scaleElement);
        } else {
          scaleElement(element);
        }
      }
    }
    this.size = {
      width: this.size.width * delta.x,
      height: this.size.height * delta.y,
    };
    this.scale = {
      x: this.scale.x * delta.x,
      y: this.scale.y * delta.y,
    };
    const offsetX = this.position.x - anchor.x;
    const offsetY = this.position.y - anchor.y;
    this.position = {
      x: anchor.x + offsetX * delta.x,
      y: anchor.y + offsetY * delta.y,
    };
    this.updateHandles();
  }

  public contains(element: Element<TElementData>): boolean {
    return !!this.selectedElements.find((el) => el.zDepth === element.zDepth);
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.boundingBox) return;
    const workAreaZoom = WorkArea.getInstance().zoomLevel;
    const workAreaOffset = WorkArea.getInstance().offset;

    // Draw bounding box
    context.save();
    context.translate(workAreaOffset.x, workAreaOffset.y);
    context.scale(workAreaZoom, workAreaZoom);
    const { topLeft, topRight, bottomLeft, bottomRight } = this.boundingBox;

    context.strokeStyle = "red";
    context.setLineDash([3 / workAreaZoom, 3 / workAreaZoom]);
    context.lineWidth = 2 / workAreaZoom;
    context.beginPath();
    context.moveTo(topLeft.x, topLeft.y);
    context.lineTo(topRight.x, topRight.y);
    context.lineTo(bottomRight.x, bottomRight.y);
    context.lineTo(bottomLeft.x, bottomLeft.y);
    context.closePath();
    context.stroke();
    // Desenhar os handles
    if (this.handles) {
      for (const key of Object.keys(this.handles)) {
        const point = this.handles[key as keyof typeof this.handles];
        context.fillStyle = "gray";
        context.beginPath();
        context.arc(point.x, point.y, 5 / workAreaZoom, 0, Math.PI * 2);
        context.closePath();
        context.fill();
      }
    }
    context.restore();
  }
}
