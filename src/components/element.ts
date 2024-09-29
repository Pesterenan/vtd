import { BoundingBox, IElementData, Position, Scale, Size } from "./types";
import { BB } from "../utils/bb";

export abstract class Element<T extends Partial<IElementData>> {
  public static elementIds = 0;
  protected _elementId = 0;
  public selected = false;

  protected properties: Map<
    keyof (IElementData & T),
    IElementData[keyof IElementData] | T[keyof T]
  > = new Map();

  public get elementId(): number {
    return this._elementId;
  }
  public get position(): Position {
    return this.properties.get("position") as Position;
  }
  public set position(value: Position) {
    this.properties.set("position", value);
  }
  public get size(): Size {
    return this.properties.get("size") as Size;
  }
  public set size(value: Size) {
    this.properties.set("size", value);
  }
  public get zDepth(): number {
    return this.properties.get("zDepth") as number;
  }
  public set zDepth(value: number) {
    this.properties.set("zDepth", value);
  }
  public get rotation(): number {
    return this.properties.get("rotation") as number;
  }
  public set rotation(value: number) {
    this.properties.set("rotation", value);
  }
  public get scale(): Scale {
    return this.properties.get("scale") as Scale;
  }
  public set scale(value: Scale) {
    this.properties.set("scale", value);
  }
  public get isVisible(): boolean {
    return this.properties.get("isVisible") as boolean;
  }
  public set isVisible(value: boolean) {
    this.properties.set("isVisible", value);
  }
  public get layerName(): string {
    return this.properties.get("layerName") as string;
  }
  public set layerName(value: string) {
    this.properties.set("layerName", value);
  }

  protected constructor(position: Position, size: Size, z: number) {
    this.position = position;
    this.size = size;
    this.zDepth = z;
    this.rotation = 0;
    this.scale = { x: 1.0, y: 1.0 };
    this.isVisible = true;
    this.layerName = "";
    this._elementId = Element.elementIds++;
  }

  public deserialize(data: T): void {
    (Object.keys(data) as Array<keyof T>).forEach((key) => {
      if (this.properties.has(key)) {
        this.properties.set(key, data[key]);
      }
    });
  }

  public serialize(): T {
    return Object.fromEntries(this.properties) as T;
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
