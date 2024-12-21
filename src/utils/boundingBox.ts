import type { Position, Size } from "src/components/types";
import { Vector } from "./vector";
import { WorkArea } from "src/components/workArea";
import { toRadians } from "./transforms";

export class BoundingBox {
  public topLeft: Position = { x: 0, y: 0 };
  public topRight: Position = { x: 0, y: 0 };
  public bottomLeft: Position = { x: 0, y: 0 };
  public bottomRight: Position = { x: 0, y: 0 };
  public center: Position;
  public rotation: number;

  constructor(position: Position, size: Size, rotation = 0) {
    this.center = position;
    this.rotation = rotation;
    this.updateCorners(position, size);
  }

  private updateCorners(position: Position, size: Size): void {
    // Cálculo dos quatro cantos antes da rotação
    this.topLeft = new Vector(position).sub(new Vector(size).div(2));
    this.topRight = {
      x: position.x + size.width / 2,
      y: position.y - size.height / 2,
    };
    this.bottomLeft = {
      x: position.x - size.width / 2,
      y: position.y + size.height / 2,
    };
    this.bottomRight = new Vector(position).add(new Vector(size).div(2));

    if (this.rotation !== 0) {
      this.rotateCorners();
    }
  }

  private rotateCorners(): void {
    this.topLeft = this.rotatePoint(this.topLeft, this.center, this.rotation);
    this.topRight = this.rotatePoint(this.topRight, this.center, this.rotation);
    this.bottomLeft = this.rotatePoint(
      this.bottomLeft,
      this.center,
      this.rotation,
    );
    this.bottomRight = this.rotatePoint(
      this.bottomRight,
      this.center,
      this.rotation,
    );
  }

  private rotatePoint(
    point: Position,
    center: Position,
    angle: number,
  ): Position {
    const radians = toRadians(angle);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    const translated = new Vector(point).sub(center);

    const rotated = {
      x: translated.x * cos - translated.y * sin,
      y: translated.x * sin + translated.y * cos,
    };

    return new Vector(rotated).add(center);
  }

  public update(position: Position, size: Size, rotation: number): void {
    this.center = position;
    this.rotation = rotation;
    this.updateCorners(position, size);
  }

  public isPointInside(point: Position): boolean {
    const unrotatedPoint = this.rotatePoint(point, this.center, -this.rotation);
    const unrotatedTopLeft = this.rotatePoint(
      this.topLeft,
      this.center,
      -this.rotation,
    );
    const unrotatedBottomRight = this.rotatePoint(
      this.bottomRight,
      this.center,
      -this.rotation,
    );
    return (
      unrotatedPoint.x >= unrotatedTopLeft.x &&
      unrotatedPoint.x <= unrotatedBottomRight.x &&
      unrotatedPoint.y >= unrotatedTopLeft.y &&
      unrotatedPoint.y <= unrotatedBottomRight.y
    );
  }

  public isWithinBounds(firstPoint: Position, secondPoint: Position): boolean {
    const minBound = {
      x: Math.min(firstPoint.x, secondPoint.x),
      y: Math.min(firstPoint.y, secondPoint.y),
    };
    const maxBound = {
      x: Math.max(firstPoint.x, secondPoint.x),
      y: Math.max(firstPoint.y, secondPoint.y),
    };
    WorkArea.getInstance().drawbox(minBound,maxBound);
    
    const unrotatedTopLeft = this.rotatePoint(
      this.topLeft,
      this.center,
      -this.rotation,
    );
    const unrotatedBottomRight = this.rotatePoint(
      this.bottomRight,
      this.center,
      -this.rotation,
    );
    WorkArea.getInstance().drawbox(unrotatedTopLeft, unrotatedBottomRight);
    return (
      unrotatedTopLeft.x >= minBound.x &&
      unrotatedTopLeft.x <= maxBound.x &&
      unrotatedTopLeft.y >= minBound.y &&
      unrotatedTopLeft.y <= maxBound.y &&
      unrotatedBottomRight.x >= minBound.x &&
      unrotatedBottomRight.x <= maxBound.x &&
      unrotatedBottomRight.y >= minBound.y &&
      unrotatedBottomRight.y <= maxBound.y
    );
  }
}
