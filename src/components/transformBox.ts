import type { Element } from "src/components/elements/element";
import type { Position, Scale, Size, TElementData } from "src/components/types";
import { BoundingBox } from "src/utils/boundingBox";
import type {
  DeltaPayload,
  EventBus,
  PositionPayload,
  UpdateScalePayload,
} from "src/utils/eventBus";
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
  public hoveredHandle: TransformBoxHandleKeys | null = null;
  public selectedHandle: TransformBoxHandleKeys | null = null;

  public constructor(
    selectedElements: Element<TElementData>[],
    eventBus: EventBus,
  ) {
    this.eventBus = eventBus;
    this.selectedElements = selectedElements;

    if (this.selectedElements.length > 0) {
      this.calculateBoundingBox();
      this.addEvents();
    }
  }

  private addEvents() {
    this.eventBus.on("transformBox:anchorPoint:change", this.changeAnchorPoint);
    this.eventBus.on("transformBox:anchorPoint:get", this.getAnchorPoint);
    this.eventBus.on(
      "transformBox:getSignAndAnchor",
      this.calculateSignAndAnchor,
    );
    this.eventBus.on("transformBox:hoverHandle", this.hoverHandle);
    this.eventBus.on("transformBox:position", this.getPosition);
    this.eventBus.on("transformBox:properties:get", this.getProperties);
    this.eventBus.on("transformBox:rotation", this.getRotation);
    this.eventBus.on("transformBox:selectHandle", this.selectHandle);
    this.eventBus.on("transformBox:updateOpacity", this.updateOpacity);
    this.eventBus.on("transformBox:updatePosition", this.updatePosition);
    this.eventBus.on("transformBox:updateRotation", this.updateRotation);
    this.eventBus.on("transformBox:updateScale", this.updateScale);
  }

  public removeEvents() {
    this.eventBus.off("transformBox:anchorPoint:get", this.getAnchorPoint);
    this.eventBus.off(
      "transformBox:anchorPoint:change",
      this.changeAnchorPoint,
    );
    this.eventBus.off(
      "transformBox:getSignAndAnchor",
      this.calculateSignAndAnchor,
    );
    this.eventBus.off("transformBox:hoverHandle", this.hoverHandle);
    this.eventBus.off("transformBox:position", this.getPosition);
    this.eventBus.off("transformBox:properties:get", this.getProperties);
    this.eventBus.off("transformBox:rotation", this.getRotation);
    this.eventBus.off("transformBox:selectHandle", this.selectHandle);
    this.eventBus.off("transformBox:updateOpacity", this.updateOpacity);
    this.eventBus.off("transformBox:updatePosition", this.updatePosition);
    this.eventBus.off("transformBox:updateRotation", this.updateRotation);
    this.eventBus.off("transformBox:updateScale", this.updateScale);
  }

  public selectHandle = (): boolean => {
    this.selectedHandle = this.hoveredHandle;
    return !!this.hoveredHandle;
  };
  private getPosition = (): Position => this.position;
  private getRotation = (): number => this.rotation;
  private getAnchorPoint = (): Position => this.anchorPoint;
  private getProperties = (): {
    position: Position;
    size: Size;
    opacity: number;
    rotation: number;
  } => {
    return {
      position: this.position,
      rotation: this.rotation,
      opacity: this.opacity,
      size: this.size,
    };
  };

  private changeAnchorPoint = ({ position }: PositionPayload): void => {
    this.anchorPoint = position;
  };

  public hoverHandle = ({ position }: PositionPayload): void => {
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
  };

  private calculateBoundingBox = (): void => {
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
      const bounds = BoundingBox.calculateBoundingBox(this.selectedElements);
      this.position = bounds.position;
      this.size = bounds.size;
    }
    // Atualiza o boundingBox da TransformBox
    this.boundingBox = new BoundingBox(this.position, this.size, this.rotation);
    this.anchorPoint = { ...this.boundingBox.center };
    // Recalcula os handles
    this.generateHandles();
    this.updateHandles();
  };

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

  public updateOpacity = ({ delta: opacity }: { delta: number }): void => {
    for (const element of this.selectedElements) {
      element.opacity = opacity;
    }
    this.opacity = opacity;
    this.updateHandles();
  };

  public updatePosition = ({ position: { x, y } }: PositionPayload): void => {
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
  };

  public updateRotation = ({ delta: angle }: DeltaPayload): void => {
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
  };

  public updateScale = ({
    delta,
    anchor = this.anchorPoint,
  }: UpdateScalePayload): void => {
    const scaleElement = (element: Element<TElementData>) => {
      const offset = {
        x: element.position.x - anchor.x,
        y: element.position.y - anchor.y,
      };
      const offsetUnrotated = rotatePoint(
        offset,
        { x: 0, y: 0 },
        -this.rotation,
      );

      offsetUnrotated.x *= delta.x;
      offsetUnrotated.y *= delta.y;
      element.scale.x *= delta.x;
      element.scale.y *= delta.y;

      const offsetRotated = rotatePoint(
        offsetUnrotated,
        { x: 0, y: 0 },
        this.rotation,
      );

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
    const offsetUnrotated = rotatePoint(offset, { x: 0, y: 0 }, -this.rotation);

    offsetUnrotated.x *= delta.x;
    offsetUnrotated.y *= delta.y;
    this.size.width *= delta.x;
    this.size.height *= delta.y;

    const offsetRotated = rotatePoint(
      offsetUnrotated,
      { x: 0, y: 0 },
      this.rotation,
    );

    this.position.x = anchor.x + offsetRotated.x;
    this.position.y = anchor.y + offsetRotated.y;

    this.updateHandles();
  };

  public contains(element: Element<TElementData>): boolean {
    return !!this.selectedElements.find((el) => el.zDepth === element.zDepth);
  }

  public calculateSignAndAnchor = (): {
    anchor: Position;
    xSign: 1 | 0 | -1;
    ySign: 1 | 0 | -1;
  } => {
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
  };

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
