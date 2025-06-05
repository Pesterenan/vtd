import { BoundingBox } from "src/utils/boundingBox";
import type { IElementGroupData, Position, Size, TElementData } from "../types";
import { Element } from "./element";

export class ElementGroup extends Element<Partial<IElementGroupData>> {
  public children: Element<TElementData>[] | null = [];

  constructor(
    position: Position,
    size: Size,
    zDepth: number,
    children: Element<TElementData>[],
  ) {
    super(position, size, zDepth);
    this.properties.set("type", "group");
    this.children = children;
  }

  public serialize(): IElementGroupData {
    const serialized = super.serialize();
    if (this.children) {
      serialized.children = this.children.map((child) => child.serialize());
    }
    return serialized as IElementGroupData;
  }

  public deserialize(data: IElementGroupData): void {
    super.deserialize(data);
    this.properties.set("children", data.children);
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;
    context.save();
    context.globalAlpha = this.opacity;
    if (this.children)  {
      for (const child of this.children) {
        if (!child.isVisible) continue;
        child.draw(context);
      }
    }
    context.restore();
  }

  public getBoundingBox(): BoundingBox {
    if (!this.children || this.children.length === 0) {
      return new BoundingBox(this.position, this.size, this.rotation);
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const child of this.children) {
      const box = child.getBoundingBox();
      const corners = [box.topLeft, box.topRight, box.bottomLeft, box.bottomRight];
      for (const corner of corners) {
        if (corner.x < minX) minX = corner.x;
        if (corner.y < minY) minY = corner.y;
        if (corner.x > maxX) maxX = corner.x;
        if (corner.y > maxY) maxY = corner.y;
      }
    }

    const center = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    };
    const size = {
      width: maxX - minX,
      height: maxY - minY,
    };
    this.position = center;
    this.size = size;
    this.rotation = 0;
    return new BoundingBox(center, size, 0);
  }
}
