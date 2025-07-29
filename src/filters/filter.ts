import type { ISelectInput } from "src/components/helpers/createSelectInput";
import createSelectInput from "src/components/helpers/createSelectInput";
import type { ISliderControl } from "src/components/helpers/createSliderControl";
import createSliderControl from "src/components/helpers/createSliderControl";
import type { ISelectOption } from "src/components/types";
import { clamp } from "src/utils/easing";

export type FilterProperty = string | number | undefined;
export const COMPOSITE_OPTIONS: Array<ISelectOption> = [
  { label: "Normal", value: "source-over" },
  { label: "Clarear", value: "lighten" },
  { label: "Cor", value: "color" },
  { label: "Diferença", value: "difference" },
  { label: "Escape de Cor", value: "color-dodge" },
  { label: "Escurecer", value: "darken" },
  { label: "Exclusão", value: "exclusion" },
  { label: "Luminosidade", value: "luminosity" },
  { label: "Luz Forte", value: "hard-light" },
  { label: "Luz Suave", value: "soft-light" },
  { label: "Mais Claro", value: "lighter" },
  { label: "Matiz", value: "hue" },
  { label: "Multiplicação", value: "multiply" },
  { label: "Queima de Cor", value: "color-burn" },
  { label: "Saturação", value: "saturation" },
  { label: "Sobreposição", value: "overlay" },
  { label: "Tela", value: "screen" },
] as const;

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
  public set composite(value: string) {
    this.properties.set("composite", value);
  }
  public get composite(): string {
    return this.properties.get("composite") as string;
  }
  public set globalAlpha(value: number) {
    this.properties.set("globalAlpha", clamp(value, 0, 1.0));
  }
  public get globalAlpha(): number {
    return this.properties.get("globalAlpha") as number;
  }

  private filterControls: HTMLDivElement | null = null;
  private opacityControl: ISliderControl | null = null;
  private compositeControl: ISelectInput | null = null;

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
    this.composite = 'source-over';
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
    writeContext: CanvasRenderingContext2D,
    readContext: CanvasRenderingContext2D,
    elementToDraw: (context: CanvasRenderingContext2D) => void,
  ): void {
    this.filterEffects(writeContext, readContext, elementToDraw);
  }

  public setupFilterControls(onChange: () => void): HTMLDivElement {
    if (this.filterControls) return this.filterControls;
    this.onChange = onChange;

    this.filterControls = document.createElement("div");
    this.filterControls.className = "sec_menu-style pad-05";
    this.filterControls.id = `${this.id}-filter-controls`;
    this.compositeControl = createSelectInput(
      `${this.id}-composite-select`,
      "Composição",
      { optionValues: COMPOSITE_OPTIONS, value: this.composite },
      this.handleCompositeChange,
    );
    this.opacityControl = createSliderControl(
      `${this.id}-opacity`,
      "Opacidade",
      { min: 0, max: 1, step: 0.01, value: this.globalAlpha },
      this.handleOpacityChange.bind(this),
    );
    this.compositeControl.linkEvents();
    this.opacityControl.linkEvents();
    this.filterControls.append(this.compositeControl.element);
    this.filterControls.append(this.opacityControl.element);
    this.appendFilterControls(this.filterControls);
    return this.filterControls;
  }

  private handleCompositeChange = (newValue: string) => {
    if (this.compositeControl) {
      this.composite = newValue;
      this.onChange();
    }
  };

  private handleOpacityChange(newValue: number): void {
    if (this.opacityControl) {
      this.globalAlpha = Number(newValue);
      this.onChange();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onChange(): void {}

  protected abstract filterEffects(
    writeContext: CanvasRenderingContext2D,
    readContext: CanvasRenderingContext2D,
    elementToDraw: (context: CanvasRenderingContext2D) => void,
  ): void;

  protected abstract appendFilterControls(container: HTMLDivElement): void;
}
