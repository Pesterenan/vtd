import type { ISliderControl } from "src/components/helpers/createSliderControl";
import createSliderControl from "src/components/helpers/createSliderControl";
import { clamp } from "src/utils/easing";

export type FilterProperty = string | number | undefined;

export abstract class Filter {
  protected properties: Map<string, FilterProperty> = new Map();
  private _priority = 0;
  public get priority(): number {
    return this._priority;
  }
  private set priority(value: number) {
    this._priority = value;
  }
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
    this.properties.set("globalAlpha", clamp(value, 0, 1.0));
  }
  public get globalAlpha(): number {
    return this.properties.get("globalAlpha") as number;
  }

  private filterControls: HTMLDivElement | null = null;
  private opacityControl: ISliderControl | null = null;

  constructor(
    id: string,
    label: string,
    applies: "before" | "after",
    priority: number,
  ) {
    this.properties.set("id", id);
    this.properties.set("label", label);
    this.properties.set("applies", applies);
    this.globalAlpha = 1.0;
    this.priority = priority;
  }

  public deserialize(data: Partial<Filter>): void {
    for (const [key, value] of Object.entries(data)) {
      if (this.properties.has(key)) {
        this.properties.set(key, value as FilterProperty);
      }
    }
  }

  public serialize(): Partial<Filter> {
    return Object.fromEntries(this.properties);
  }

  public apply(
    mainContext: CanvasRenderingContext2D,
    drawElementOn?: (context: CanvasRenderingContext2D) => void,
  ): void {
    mainContext.globalAlpha = this.globalAlpha;
    this.filterEffects(mainContext, drawElementOn);
  }

  public setupFilterControls(onChange: () => void): HTMLDivElement {
    if (this.filterControls) return this.filterControls;
    this.onChange = onChange;

    this.filterControls = document.createElement("div");
    this.filterControls.className = "sec_menu-style pad-05";
    this.filterControls.id = `${this.id}-filter-controls`;
    this.opacityControl = createSliderControl(
      `${this.id}-opacity`,
      "Opacidade",
      { min: 0, max: 1, step: 0.01, value: this.globalAlpha },
      this.handleOpacityChange.bind(this),
    );
    this.opacityControl.linkEvents();
    this.filterControls.append(this.opacityControl.element);
    this.appendFilterControls(this.filterControls);
    return this.filterControls;
  }

  private handleOpacityChange(newValue: number): void {
    if (this.opacityControl) {
      this.globalAlpha = Number(newValue);
      this.onChange();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onChange(): void {}

  protected abstract filterEffects(
    context: CanvasRenderingContext2D,
    drawElementOn?: (context: CanvasRenderingContext2D) => void,
  ): void;

  protected abstract appendFilterControls(container: HTMLDivElement): void;
}
