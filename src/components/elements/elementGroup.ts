import { BoundingBox } from "src/utils/boundingBox";
import { Element } from "./element";
import type { IElementGroupData, Position, Size, TElementData } from "../types";

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
    this.children?.forEach((child) => {
      if (!child.isVisible) return;
      child.draw(context);
    });
    context.restore();
  }

  public getBoundingBox(): BoundingBox {
    if (!this.children || this.children.length === 0) {
      return new BoundingBox(this.position, this.size, this.rotation);
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    this.children.forEach((child) => {
      const box = child.getBoundingBox();
      const corners = [box.topLeft, box.topRight, box.bottomLeft, box.bottomRight];
      corners.forEach((corner) => {
        if (corner.x < minX) minX = corner.x;
        if (corner.y < minY) minY = corner.y;
        if (corner.x > maxX) maxX = corner.x;
        if (corner.y > maxY) maxY = corner.y;
      });
    });

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
