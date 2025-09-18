import type { Position, Scale, Size, IElementData } from "components/types";
import type { FilterProperties } from "src/filters/filter";
import type { BoundingBox } from "src/utils/boundingBox";
import type { CroppingBox } from "src/utils/croppingBox";

export abstract class Element<T extends IElementData> {
  public static elementIds = 0;
  protected _elementId = 0;
  public selected = false;

  protected properties: Map<
    keyof T,
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
  public get opacity(): number {
    return this.properties.get("opacity") as number;
  }
  public set opacity(value: number) {
    this.properties.set("opacity", value);
  }
  public get scale(): Scale {
    return this.properties.get("scale") as Scale;
  }
  public set scale(value: Scale) {
    this.properties.set("scale", value);
  }
  public get isLocked(): boolean {
    return this.properties.get("isLocked") as boolean;
  }
  public set isLocked(value: boolean) {
    this.properties.set("isLocked", value);
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
  public get filters(): FilterProperties[] {
    return this.properties.get("filters") as FilterProperties[];
  }
  public set filters(value: FilterProperties[]) {
    this.properties.set("filters", value);
  }

  protected constructor(position: Position, size: Size, z: number) {
    this.position = position;
    this.size = size;
    this.zDepth = z;
    this.rotation = 0;
    this.opacity = 1;
    this.scale = { x: 1.0, y: 1.0 };
    this.isVisible = true;
    this.isLocked = false;
    this.layerName = "";
    this._elementId = Element.elementIds++;
    this.filters = [];
  }

  public deserialize(data: T): void {
    for (const key of Object.keys(data) as Array<keyof T>) {
      if (!this.properties.has(key)) continue;
      if (key === "filters" && Array.isArray(data.filters)) {
        this.properties.set(key, data.filters);
        continue;
      }
      this.properties.set(key, data[key]);
    }
  }

  public serialize(): T {
    return Object.fromEntries(this.properties) as unknown as T;
  }

  public abstract draw(context: CanvasRenderingContext2D): void;
  public abstract getBoundingBox(): BoundingBox;

  public getCroppingBox(): CroppingBox | null {
    return null;
  }
}


