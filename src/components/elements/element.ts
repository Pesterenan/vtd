import type { IElementData, Position, Scale, Size } from "components/types";
import type { Filter } from "src/filters/filter";
import { createFilter } from "src/filters/filterFactory";
import type { BoundingBox } from "src/utils/boundingBox";

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
  public get filters(): Filter[] {
    return this.properties.get("filters") as Filter[];
  }
  public set filters(value: Filter[]) {
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
        const filters = data.filters
          .map(createFilter)
          .filter((f) => f !== null);
        this.properties.set(key, filters);
        continue;
      }
      this.properties.set(key, data[key]);
    }
  }

  public serialize(): T {
    const serialized = Object.fromEntries(this.properties) as T;
    if (this.properties.has("filters")) {
      const filters = (this.properties.get("filters") as Filter[]).map(
        (filter) => filter.serialize(),
      );
      serialized.filters = filters as Filter[];
    }
    return serialized;
  }

  public abstract draw(context: CanvasRenderingContext2D): void;
  public abstract getBoundingBox(): BoundingBox;
}
