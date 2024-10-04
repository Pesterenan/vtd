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

  public deserialize(data: Partial<Filter>): void {
    Object.entries(data).forEach(([key, value]) => {
      if (this.properties.has(key)) {
        this.properties.set(key, value as FilterProperty);
      }
    });
  }

  public serialize(): Partial<Filter> {
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

  abstract apply(context: CanvasRenderingContext2D): void;
  abstract getFilterControls(): HTMLDivElement | null;
}
