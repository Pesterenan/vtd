import { Element } from "./element";
import { TElementData } from "./types";

export type FilterProperty = string | number | undefined;

export abstract class Filter {
  protected properties: Map<string, FilterProperty> = new Map();
  public get id(): string {
    return this.properties.get("id") as string;
  }
  public get label(): string {
    return this.properties.get("label") as string;
  }
  public get applies(): "before" | "after" {
    return this.properties.get("applies") as "before" | "after";
  }
  public set globalAlpha(value: number) {
    this.setPropertyLimited("globalAlpha", value, 0, 1.0);
  }
  public get globalAlpha(): number {
    return this.properties.get("globalAlpha") as number;
  }

  constructor(id: string, label: string, applies: "before" | "after") {
    this.properties.set("id", id);
    this.properties.set("label", label);
    this.properties.set("applies", applies);
    this.globalAlpha = 1.0;
  }

  public deserialize(data: Record<string, FilterProperty>): void {
    Object.entries(data).forEach(([key, value]) => {
      if (this.properties.has(key)) {
        this.properties.set(key, value);
      }
    });
  }

  public serialize(): Record<string, FilterProperty> {
    return Object.fromEntries(this.properties);
  }

  protected setPropertyLimited<T>(
    key: string,
    value: T,
    min: number,
    max: number,
  ): void {
    this.properties.set(key, Math.max(min, Math.min(value as number, max)));
  }

  abstract apply<T extends TElementData>(
    context: CanvasRenderingContext2D,
    element: Element<T>,
  ): void;
  abstract getFilterControls(): HTMLDivElement | null;
}
