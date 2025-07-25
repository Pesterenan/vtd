import type { Element } from "src/components/elements/element";
import type { Position, Scale, Size, TElementData } from "src/components/types";
import { BoundingBox } from "src/utils/boundingBox";
import type { EventBus } from "src/utils/eventBus";
import { rotatePoint, toRadians } from "src/utils/transforms";
import { Vector } from "src/utils/vector";
import { ElementGroup } from "./elements/elementGroup";

export type TransformBoxHandleKeys =
  | "BOTTOM"
  | "BOTTOM_LEFT"
  | "BOTTOM_RIGHT"
  | "CENTER"
  | "LEFT"
  | "RIGHT"
  | "TOP"
  | "TOP_LEFT"
  | "TOP_RIGHT";

export class TransformBox {
  public position: Position = { x: 0, y: 0 };
  public scale: Scale = { x: 1.0, y: 1.0 };
  public size: Size = { width: 0, height: 0 };
  public anchorPoint: Position = { x: 0, y: 0 };
  public rotation = 0;
  public opacity = 1;

  private selectedElements: Element<TElementData>[] = [];
  public boundingBox: BoundingBox | null = null;
  public handles: Record<TransformBoxHandleKeys, Position> | null = null;
  private eventBus: EventBus;
  private onUpdateOpacity: (payload: { delta: number }) => void;
  private onUpdatePosition: (payload: { delta: Position }) => void;
  private onUpdateRotation: (payload: { delta: number }) => void;
  private onUpdateScale: (payload: { delta: Scale, anchor?: Position }) => void;
  private getAnchorPoint: () => Position;
  private getSignAndAnchor: () => {
  anchor: Position;
    xSign: 1 | 0 | -1;
    ySign: 1 | 0 | -1;}
  private getProperties: () => {
    position: Position;
    size: Size;
    opacity: number;
    rotation: number;
  };
  private getPosition: () => Position;
  private getRotation: () => number;
  private onChangeAnchorPoint: (payload: { position: Position }) => void;
  private onHoverHandle: (payload: { position: Position }) => void;
  private onSelectHandle: () => boolean;
  public hoveredHandle: TransformBoxHandleKeys | null = null;
  public selectedHandle: TransformBoxHandleKeys | null = null;

  public constructor(
    selectedElements: Element<TElementData>[],
    eventBus: EventBus,
  ) {
    this.eventBus = eventBus;
    this.selectedElements = selectedElements;
    this.onUpdateOpacity = ({ delta }) => {
      this.updateOpacity(delta);
    };
    this.onUpdatePosition = ({ delta }) => {
      this.updatePosition(delta);
    };
    this.onUpdateRotation = ({ delta }) => {
      this.updateRotation(delta);
    };
    this.onUpdateScale = ({ delta, anchor }) => {
      this.updateScale(delta, anchor);
    };
    this.onChangeAnchorPoint = ({ position }) => {
      this.anchorPoint = position;
    };
    this.onHoverHandle = ({ position }) => this.hoverHandle(position);
    this.onSelectHandle = () => this.selectHandle();
    this.getAnchorPoint = () => this.anchorPoint;
    this.getPosition = () => this.position;
    this.getRotation = () => this.rotation;
    this.getProperties = () => {
      return {
        position: this.position,
        rotation: this.rotation,
        opacity: this.opacity,
        size: this.size,
      };
    };
    this.getSignAndAnchor = () => this.calculateSignAndAnchor();

    if (this.selectedElements.length > 0) {
      this.calculateBoundingBox();
      this.addEvents();
    }
  }

  private addEvents() {
    this.eventBus.on("transformBox:updateOpacity", this.onUpdateOpacity);
    this.eventBus.on("transformBox:updatePosition", this.onUpdatePosition);
    this.eventBus.on("transformBox:updateRotation", this.onUpdateRotation);
    this.eventBus.on("transformBox:updateScale", this.onUpdateScale);
    this.eventBus.on(
      "transformBox:anchorPoint:change",
      this.onChangeAnchorPoint,
    );
    this.eventBus.on("transformBox:anchorPoint:get", this.getAnchorPoint);
    this.eventBus.on("transformBox:properties:get", this.getProperties);
    this.eventBus.on("transformBox:position", this.getPosition);
    this.eventBus.on("transformBox:rotation", this.getRotation);
    this.eventBus.on("transformBox:hoverHandle", this.onHoverHandle);
    this.eventBus.on("transformBox:selectHandle", this.onSelectHandle);
    this.eventBus.on("transformBox:getSignAndAnchor", this.getSignAndAnchor);
  }

  public removeEvents() {
    this.eventBus.off("transformBox:updateOpacity", this.onUpdateOpacity);
    this.eventBus.off("transformBox:updatePosition", this.onUpdatePosition);
    this.eventBus.off("transformBox:updateRotation", this.onUpdateRotation);
    this.eventBus.off("transformBox:updateScale", this.onUpdateScale);
    this.eventBus.off(
      "transformBox:anchorPoint:change",
      this.onChangeAnchorPoint,
    );
    this.eventBus.off("transformBox:anchorPoint:get", this.getAnchorPoint);
    this.eventBus.off("transformBox:properties:get", this.getProperties);
    this.eventBus.off("transformBox:position", this.getPosition);
    this.eventBus.off("transformBox:rotation", this.getRotation);
    this.eventBus.off("transformBox:hoverHandle", this.onHoverHandle);
    this.eventBus.off("transformBox:selectHandle", this.onSelectHandle);
    this.eventBus.off("transformBox:getSignAndAnchor", this.getSignAndAnchor);
  }

  public selectHandle(): boolean {
    this.selectedHandle = this.hoveredHandle;
    return !!this.hoveredHandle;
  }

  public hoverHandle(position: Position): void {
    if (this.handles) {
      const hitHandle = (
        Object.keys(this.handles) as TransformBoxHandleKeys[]
      ).find((key) => {
        if (this.handles) {
          const point = this.handles[key];
          return Math.hypot(position.x - point.x, position.y - point.y) < 30;
        }
        return false;
      });
      this.hoveredHandle = hitHandle || null;
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
      this.anchorPoint = { ...element.position };
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
    }
    // Atualiza o boundingBox da TransformBox
    this.boundingBox = new BoundingBox(this.position, this.size, this.rotation);
    this.anchorPoint = { ...this.boundingBox.center };
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

  private updateHandles(): void {
    if (this.boundingBox && this.handles) {
      this.boundingBox.update(this.position, this.size, this.rotation);
      this.generateHandles();
    }
    this.eventBus.emit("transformBox:properties:change", {
      position: this.position,
      size: this.size,
      rotation: this.rotation,
      opacity: this.opacity,
    });
    this.eventBus.emit("workarea:update");
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
    this.updateHandles();
  }

  public updateRotation(angle: number): void {
    const deltaAngle = angle - this.rotation;
    const deltaPos = rotatePoint(this.position, this.anchorPoint, deltaAngle);
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

  public updateScale(delta: Scale, anchor: Position = this.anchorPoint): void {
    const scaleElement = (element: Element<TElementData>) => {
      const offset = {
        x: element.position.x - anchor.x,
        y: element.position.y - anchor.y,
      };
      const offsetUnrotated = rotatePoint(offset, {x:0, y:0}, -this.rotation);

      offsetUnrotated.x *= delta.x;
      offsetUnrotated.y *= delta.y;
      element.scale.x *= delta.x;
      element.scale.y *= delta.y;

      const offsetRotated = rotatePoint(offsetUnrotated, {x:0, y:0}, this.rotation);

      element.position.x = anchor.x + offsetRotated.x;
      element.position.y = anchor.y + offsetRotated.y;
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

    const offset = {
      x: this.position.x - anchor.x,
      y: this.position.y - anchor.y,
    };
    const offsetUnrotated = rotatePoint(offset, {x:0, y:0}, -this.rotation);

    offsetUnrotated.x *= delta.x;
    offsetUnrotated.y *= delta.y;
    this.size.width *= delta.x;
    this.size.height *= delta.y;

    const offsetRotated = rotatePoint(offsetUnrotated, {x:0, y:0}, this.rotation);

    this.position.x = anchor.x + offsetRotated.x;
    this.position.y = anchor.y + offsetRotated.y;

    this.updateHandles();
  }

  public contains(element: Element<TElementData>): boolean {
    return !!this.selectedElements.find((el) => el.zDepth === element.zDepth);
  }

  public calculateSignAndAnchor(): {
    anchor: Position;
    xSign: 1 | 0 | -1;
    ySign: 1 | 0 | -1;
  } {
    let anchor = this.anchorPoint;
    let xSign: 1 | 0 | -1 = 1;
    let ySign: 1 | 0 | -1 = 1;

    if (!this.handles || !this.selectedHandle) return { anchor, xSign, ySign };

    switch (this.selectedHandle) {
      case "TOP_LEFT":
        xSign = -1;
        ySign = -1;
        anchor = this.handles.BOTTOM_RIGHT;
        break;
      case "TOP_RIGHT":
        xSign = 1;
        ySign = -1;
        anchor = this.handles.BOTTOM_LEFT;
        break;
      case "BOTTOM_RIGHT":
        xSign = 1;
        ySign = 1;
        anchor = this.handles.TOP_LEFT;
        break;
      case "BOTTOM_LEFT":
        xSign = -1;
        ySign = 1;
        anchor = this.handles.TOP_RIGHT;
        break;
      case "TOP":
        xSign = 0;
        ySign = -1;
        anchor = this.handles.BOTTOM;
        break;
      case "RIGHT":
        xSign = 1;
        ySign = 0;
        anchor = this.handles.LEFT;
        break;
      case "BOTTOM":
        xSign = 0;
        ySign = 1;
        anchor = this.handles.TOP;
        break;
      case "LEFT":
        xSign = -1;
        ySign = 0;
        anchor = this.handles.RIGHT;
        break;
      case "CENTER":
        xSign = 0;
        ySign = 0;
        anchor = this.handles.CENTER;
        break;
    }
    return { anchor, xSign, ySign };
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.boundingBox) return;
    const [zoomLevel] = this.eventBus.request("zoomLevel:get");
    const [workAreaOffset] = this.eventBus.request("workarea:offset:get");

    // Draw bounding box
    context.save();
    context.translate(workAreaOffset.x, workAreaOffset.y);
    context.scale(zoomLevel, zoomLevel);
    const { topLeft, topRight, bottomLeft, bottomRight } = this.boundingBox;

    context.strokeStyle = "red";
    context.setLineDash([3 / zoomLevel, 3 / zoomLevel]);
    context.lineWidth = 2 / zoomLevel;
    context.beginPath();
    context.moveTo(topLeft.x, topLeft.y);
    context.lineTo(topRight.x, topRight.y);
    context.lineTo(bottomRight.x, bottomRight.y);
    context.lineTo(bottomLeft.x, bottomLeft.y);
    context.closePath();
    context.stroke();
    // Desenhar os handles
    if (this.handles) {
      for (const key of Object.keys(this.handles) as TransformBoxHandleKeys[]) {
        const point = this.handles[key];
        context.fillStyle = key === this.hoveredHandle ? "blue" : "gray";
        context.beginPath();
        context.arc(point.x, point.y, 5 / zoomLevel, 0, Math.PI * 2);
        context.closePath();
        context.fill();
      }
    }
    context.restore();
  }
}
