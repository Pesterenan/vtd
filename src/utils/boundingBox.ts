import type { Position, Size, TElementData } from "src/components/types";
import type { Element } from "src/components/elements/element";
import { rotatePoint } from "./transforms";
import { Vector } from "./vector";

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
    this.topLeft = rotatePoint(this.topLeft, this.center, this.rotation);
    this.topRight = rotatePoint(this.topRight, this.center, this.rotation);
    this.bottomLeft = rotatePoint(this.bottomLeft, this.center, this.rotation);
    this.bottomRight = rotatePoint(
      this.bottomRight,
      this.center,
      this.rotation,
    );
  }

  public update(position: Position, size: Size, rotation: number): void {
    this.center = position;
    this.rotation = rotation;
    this.updateCorners(position, size);
  }

  public isPointInside(point: Position): boolean {
    const unrotatedPoint = rotatePoint(point, this.center, -this.rotation);
    const unrotatedTopLeft = rotatePoint(
      this.topLeft,
      this.center,
      -this.rotation,
    );
    const unrotatedBottomRight = rotatePoint(
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

    const unrotatedTopLeft = rotatePoint(
      this.topLeft,
      this.center,
      -this.rotation,
    );
    const unrotatedBottomRight = rotatePoint(
      this.bottomRight,
      this.center,
      -this.rotation,
    );

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

  public static calculateBoundingBox(elements: Array<Element<TElementData>>): {
    position: Position;
    size: Size;
  } {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const element of elements) {
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
    return {
      position: { x: minX + width / 2, y: minY + height / 2 },
      size: { width, height },
    };
  }
}
