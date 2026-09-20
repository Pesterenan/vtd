/* eslint-disable @typescript-eslint/no-empty-function */
import type {
  IColorStop,
  IElementData,
  Point,
  Position,
  Scale,
  Size,
  TElementData,
} from "components/types";
import type { FilterProperties } from "src/filters/filter";
import type { BoundingBox } from "src/utils/boundingBox";
import type { CroppingBox, ICroppingBoxData } from "src/utils/croppingBox";

/** Value types storable in an element's property bag. */
export type ElementPropertyValue =
  | IElementData[keyof IElementData]
  | ICroppingBoxData
  | IColorStop[]
  | Point[]
  | TElementData[]
  | undefined;

export abstract class Element {
  public static elementIds = 0;
  /**
   * Unique instance id, assigned in the constructor.
   *
   * Deliberately OUTSIDE `properties` and `serialize()`: ids are always
   * regenerated on load/copy (see `createElementFromData`). Never persist
   * nor restore `elementId` — duplicating it corrupts selection and layers.
   */
  protected _elementId = 0;
  public selected = false;

  protected properties: Map<string, ElementPropertyValue> = new Map();

  public get elementId(): number {
    return this._elementId;
  }
  public get position(): Position {
    return this.properties.get("position") as Position;
  }
  public set position(value: Position) {
    const current = this.properties.get("position") as Position | undefined;
    this.properties.set("position", value);
    if (current) {
      this.onPositionChanged({
        x: value.x - current.x,
        y: value.y - current.y,
      });
    }
  }
  /** Rigid-body compensation hook (e.g. gradient handles). No-op by default. */
  protected onPositionChanged(_delta: Position): void {}
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
    const current = this.properties.get("rotation") as number | undefined;
    this.properties.set("rotation", value);
    if (current !== undefined) {
      this.onRotationChanged(value - current);
    }
  }
  /** Rigid-body compensation hook (e.g. gradient handles). No-op by default. */
  protected onRotationChanged(_deltaAngle: number): void {}
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

  public deserialize(data: IElementData): void {
    const raw = data as unknown as Record<string, ElementPropertyValue>;
    for (const key of Object.keys(raw)) {
      if (!this.properties.has(key)) continue;
      const value = raw[key];
      if (key === "filters" && Array.isArray(value)) {
        this.properties.set(key, value);
        continue;
      }
      this.properties.set(key, value);
    }
  }

  public serialize(): IElementData {
    return Object.fromEntries(this.properties) as unknown as IElementData;
  }

  public abstract draw(context: CanvasRenderingContext2D): void;
  public abstract getBoundingBox(): BoundingBox;

  public getCroppingBox(): CroppingBox | null {
    return null;
  }
}
