import { BoundingBox, IElementData, Position, Scale, Size } from "./types";
import { BB } from "../utils/bb";

export abstract class Element {
  public static elementIds = 0;
  public elementId: number;
  public position: Position;
  public rotation = 0;
  public scale: Scale = { x: 1.0, y: 1.0 };
  public size: Size;
  public zDepth: number;
  public selected = false;
  public isVisible = true;
  public layerName = "";

  protected constructor(position: Position, size: Size, z: number) {
    this.position = position;
    this.size = size;
    this.zDepth = z;
    this.elementId = Element.elementIds++;
  }

  public deserialize(data: IElementData): void {
    this.position = data.position;
    this.size = data.size;
    this.zDepth = data.zDepth;
    this.rotation = data.rotation;
    this.scale = data.scale;
    this.isVisible = data.isVisible;
    this.layerName = data.layerName;
  }

  public serialize(): IElementData {
    return {
      position: this.position,
      size: this.size,
      zDepth: this.zDepth,
      rotation: this.rotation,
      scale: this.scale,
      isVisible: this.isVisible,
      layerName: this.layerName,
    };
  }

  public abstract draw(context: CanvasRenderingContext2D): void;
  public abstract getTransformedBoundingBox(): BoundingBox;

  public isBelowSelection(selection: BoundingBox | null): boolean {
    if (!selection) return false;
    const elementBoundingBox: BoundingBox = this.getTransformedBoundingBox();
    return new BB(selection).isBBWithin(elementBoundingBox);
  }

  public isWithinBounds(selection: BoundingBox | null): boolean {
    if (!selection) return false;
    const elementBoundingBox: BoundingBox = this.getTransformedBoundingBox();
    return new BB(elementBoundingBox).isBBWithin(selection);
  }
}
