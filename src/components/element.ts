import { BoundingBox, IElementData, Position, Scale, Size } from "./types";
import { BB } from "../utils/bb";

export abstract class Element {
  public static elementIds = 0;

  protected properties: Map<
    keyof IElementData,
    IElementData[keyof IElementData]
  > = new Map<keyof IElementData, IElementData[keyof IElementData]>([
    ["elementId", 0],
    ["position", { x: 1.0, y: 1.0 }],
    ["size", { width: 1.0, height: 1.0 }],
    ["zDepth", 0],
    ["rotation", 0],
    ["scale", { x: 1.0, y: 1.0 }],
    ["selected", false],
    ["isVisible", true],
    ["layerName", ""],
  ]);

  public get elementId(): number {
    return this.properties.get("elementId") as number;
  }
  public set elementId(value: number) {
    this.properties.set("elementId", value);
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
  public get selected(): boolean {
    return this.properties.get("selected") as boolean;
  }
  public set selected(value: boolean) {
    this.properties.set("selected", value);
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
    this.properties.set("position", position);
    this.properties.set("size", size);
    this.properties.set("zDepth", z);
    this.properties.set("elementId", Element.elementIds++);
  }

  public deserialize(data: IElementData): void {
    (Object.keys(data) as Array<keyof IElementData>).forEach((key) => {
      if (this.properties.has(key)) {
        this.properties.set(key, data[key]);
      }
    });
  }

  public serialize(): IElementData {
    return Object.fromEntries(this.properties) as IElementData;
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
