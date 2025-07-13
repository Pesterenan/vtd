import type { ISliderControl } from "src/components/helpers/createSliderControl";
import createSliderControl from "src/components/helpers/createSliderControl";
import { clamp } from "src/utils/easing";
import { Filter } from "./filter";

export class ColorCorrectionFilter extends Filter {
  private brightnessControl: ISliderControl | null = null;
  private contrastControl: ISliderControl | null = null;
  private grayScaleControl: ISliderControl | null = null;
  private hueControl: ISliderControl | null = null;
  private saturationControl: ISliderControl | null = null;

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
  public get grayscale(): number {
    return this.properties.get("grayscale") as number;
  }
  public set grayscale(value: number) {
    this.properties.set("grayscale", clamp(value, 0, 100));
  }
  public set brightness(value: number) {
    this.properties.set("brightness", clamp(value, 0, 150));
  }
  public get brightness(): number {
    return this.properties.get("brightness") as number;
  }
  public set contrast(value: number) {
    this.properties.set("contrast", clamp(value, 0, 150));
  }
  public get contrast(): number {
    return this.properties.get("contrast") as number;
  }

  constructor() {
    super("color-correction", "Correção de Cor", "after");
    this.brightness = 100;
    this.contrast = 100;
    this.grayscale = 0;
    this.hue = 0;
    this.saturation = 100;
  }

  protected filterEffects(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    source: OffscreenCanvas | HTMLImageElement,
  ): void {
    context.filter = `grayscale(${this.grayscale}%) hue-rotate(${this.hue}deg) saturate(${this.saturation}%) brightness(${this.brightness}%) contrast(${this.contrast}%)`;
    context.drawImage(source, -source.width * 0.5, -source.height * 0.5);
  }

  protected appendFilterControls(container: HTMLDivElement): void {
    this.brightnessControl = createSliderControl(
      `${this.id}-brightness`,
      "Brilho",
      { min: 0, max: 150, step: 5, value: this.brightness },
      this.handleBrightnessControlChange,
    );
    this.contrastControl = createSliderControl(
      `${this.id}-contrast`,
      "Contraste",
      { min: 0, max: 150, step: 5, value: this.contrast },
      this.handleContrastControlChange,
    );
    this.grayScaleControl = createSliderControl(
      `${this.id}-grayscale`,
      "Escala de Cinza",
      { min: 0, max: 100, step: 1, value: this.grayscale },
      this.handleGrayScaleChange,
    );
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
    this.hueControl.linkEvents();
    this.saturationControl.linkEvents();
    this.grayScaleControl.linkEvents();
    this.brightnessControl.linkEvents();
    this.contrastControl.linkEvents();

    container.append(
      this.brightnessControl.element,
      this.contrastControl.element,
      this.grayScaleControl.element,
      this.hueControl.element,
      this.saturationControl.element,
    );
  }

  private handleBrightnessControlChange = (newValue: number): void => {
    this.brightness = Number(newValue);
    this.onChange();
  };
  private handleContrastControlChange = (newValue: number): void => {
    this.contrast = Number(newValue);
    this.onChange();
  };
  private handleGrayScaleChange = (newValue: number): void => {
    this.grayscale = Number(newValue);
    this.onChange();
  };
  private handleHueControlChange = (newValue: number): void => {
    this.hue = Number(newValue);
    this.onChange();
  };
  private handleSaturationChange = (newValue: number): void => {
    this.saturation = Number(newValue);
    this.onChange();
  };
}
