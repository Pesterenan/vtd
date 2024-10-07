import EVENT from "src/utils/customEvents";
import { Filter } from "src/filters/filter";
import { clamp } from "src/utils/easing";
import type {  IColorControl } from "src/components/helpers/createColorControl";
import { createColorControl } from "src/components/helpers/createColorControl";
import type { ISliderControl } from "src/components/helpers/createSliderControl";
import { createSliderControl } from "src/components/helpers/createSliderControl";

export class OuterGlowFilter extends Filter {
  public set blur(value: number) {
    this.properties.set("blur", clamp(value, 0, 100));
  }
  public get blur(): number {
    return this.properties.get("blur") as number;
  }
  public set color(value: string) {
    this.properties.set("color", value ? (value as string) : "#AAAAAA");
  }
  public get color(): string {
    return this.properties.get("color") as string;
  }

  private filterControls: HTMLDivElement | null = null;
  private blurControl: ISliderControl | null = null;
  private colorControl: IColorControl | null = null;

  constructor() {
    super("outer-glow", "Luz Brilhante (Fora)", "before");
    this.blur = 10;
    this.color = "#FFFAAA";
    this.createDOMElements();
  }

  apply(context: CanvasRenderingContext2D): void {
    context.save();
    context.globalAlpha = this.globalAlpha;
    context.shadowColor = this.color;
    context.shadowBlur = this.blur;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
  }

  public deserialize(data: Partial<Filter>): void {
    super.deserialize(data);
    this.createDOMElements();
  }

  getFilterControls(): HTMLDivElement | null {
    return this.filterControls;
  }

  createDOMElements(): void {
    this.filterControls = document.createElement("div");
    this.filterControls.className = "sec_menu-style pad-05";
    this.filterControls.id = `${this.id}-filter-controls`;

    this.blurControl = createSliderControl(
      `${this.id}-blur`,
      "Desfoque",
      { min: 0, max: 100, step: 1, value: this.blur },
      this.handleBlurControlChange,
    );

    this.colorControl = createColorControl(
      `${this.id}-color`,
      "Cor",
      { value: this.color },
      this.handleColorControlChange,
    );

    this.blurControl.linkEvents();
    this.colorControl.linkEvents();
    this.filterControls.append(
      this.blurControl.element,
      this.colorControl.element,
    );
  }

  private handleBlurControlChange = (newValue: number): void => {
    if (this.blurControl) {
      this.blur = Number(newValue);
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };

  private handleColorControlChange = (newValue: string): void => {
    if (this.colorControl) {
      this.color = newValue;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };
}
