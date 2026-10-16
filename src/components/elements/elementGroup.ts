import { BoundingBox } from "src/utils/boundingBox";
import type { IElementGroupData, Position, Size, TElementData } from "../types";
import { Element } from "./element";

export class ElementGroup extends Element {
  public children: Element[] = [];

  constructor(
    position: Position,
    size: Size,
    zDepth: number,
    children: Element[],
  ) {
    super(position, size, zDepth);
    this.properties.set("type", "group");
    this.children = children;
  }

  public serialize(): IElementGroupData {
    const serialized = super.serialize() as IElementGroupData;
    if (this.children) {
      serialized.children = this.children.map((child) =>
        child.serialize(),
      ) as TElementData[];
    }
    return serialized;
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
    const { position, size } = BoundingBox.calculateBoundingBox(this.children);
    return new BoundingBox(position, size, this.rotation);
  }
}
