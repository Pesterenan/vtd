import EVENT, { dispatch } from "src/utils/customEvents";
import { Filter } from "./filter";
import { clamp } from "src/utils/easing";
import type { ISliderControl } from "src/components/helpers/createSliderControl";
import { createSliderControl } from "src/components/helpers/createSliderControl";

export class ColorCorrectionFilter extends Filter {
  private hueControl: ISliderControl | null = null;
  private saturationControl: ISliderControl | null = null;
  private grayScaleControl: ISliderControl | null = null;
  public get hue(): number {
    return this.properties.get("hue") as number;
  }
  public set hue(value: number) {
    this.properties.set("hue", clamp(value, 0, 360));
  }
  public get saturation(): number {
    return this.properties.get("saturation") as number;
  }
  public set saturation(value: number) {
    this.properties.set("saturation", clamp(value, 0, 200));
  }
  public get grayScale(): number {
    return this.properties.get("grayScale") as number;
  }
  public set grayScale(value: number) {
    this.properties.set("grayScale", clamp(value, 0, 100));
  }

  constructor() {
    super("color-correction", "Correção de Cor", "after");
    this.hue = 0;
    this.saturation = 100;
    this.grayScale = 0;
  }

  protected filterEffects(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    source: OffscreenCanvas | HTMLImageElement,
  ): void {
    context.filter = `grayscale(${this.grayScale}%) hue-rotate(${this.hue}deg) saturate(${this.saturation}%)`;
    context.drawImage(source, -source.width * 0.5, -source.height * 0.5);
  }

  protected onValueChange(): void {
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  protected appendFilterControls(container: HTMLDivElement): void {
    this.hueControl = createSliderControl(
      `${this.id}-hue`,
      "Matiz",
      { min: 0, max: 360, step: 1, value: this.hue },
      this.handleHueControlChange,
    );
    this.saturationControl = createSliderControl(
      `${this.id}-saturation`,
      "Saturação",
      { min: 0, max: 200, step: 1, value: this.saturation },
      this.handleSaturationChange,
    );
    this.grayScaleControl = createSliderControl(
      `${this.id}-grayscale`,
      "Escala de Cinza",
      { min: 0, max: 100, step: 1, value: this.grayScale },
      this.handleGrayScaleChange,
    );
    this.hueControl.linkEvents();
    this.saturationControl.linkEvents();
    this.grayScaleControl.linkEvents();

    container.append(
      this.hueControl.element,
      this.saturationControl.element,
      this.grayScaleControl.element,
    );
  }

  private handleHueControlChange = (newValue: number): void => {
    this.hue = Number(newValue);
    this.onValueChange();
  };
  private handleSaturationChange = (newValue: number): void => {
    this.saturation = Number(newValue);
    this.onValueChange();
  };
  private handleGrayScaleChange = (newValue: number): void => {
    this.grayScale = Number(newValue);
    this.onValueChange();
  };
}
