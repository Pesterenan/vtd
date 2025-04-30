import EVENT, { dispatch } from "src/utils/customEvents";
import { Filter } from "src/filters/filter";
import { clamp } from "src/utils/easing";
import type { IColorControl } from "src/components/helpers/createColorControl";
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

  private blurControl: ISliderControl | null = null;
  private colorControl: IColorControl | null = null;

  constructor() {
    super("outer-glow", "Luz Brilhante (Fora)", "before");
    this.blur = 10;
    this.color = "#FFFAAA";
  }

  filterEffects(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    source: OffscreenCanvas | HTMLImageElement,
  ): void {
    context.shadowColor = this.color;
    context.shadowBlur = this.blur;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.drawImage(source, -source.width * 0.5, -source.height * 0.5);
  }

  protected appendFilterControls(container: HTMLDivElement): void {
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
    container.append(
      this.blurControl.element,
      this.colorControl.element,
    );
  }

  private handleBlurControlChange = (newValue: number): void => {
    if (this.blurControl) {
      this.blur = Number(newValue);
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  };

  private handleColorControlChange = (newValue: string): void => {
    if (this.colorControl) {
      this.color = newValue;
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  };

  protected onOpacityChange(): void {
      dispatch(EVENT.UPDATE_WORKAREA);
  }
}
