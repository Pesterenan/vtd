import EVENT, { dispatch } from "src/utils/customEvents";
import { Filter } from "./filter";
import { clamp } from "src/utils/easing";
import type { ISliderControl } from "src/components/helpers/createSliderControl";
import { createSliderControl } from "src/components/helpers/createSliderControl";

export class BrightnessContrastFilter extends Filter {
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
  private brightnessControl: ISliderControl | null = null;
  private contrastControl: ISliderControl | null = null;

  constructor() {
    super("brightness-contrast", "Brilho e Contraste", "after");
    this.brightness = 100;
    this.contrast = 100;
  }

  protected filterEffects(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    source: OffscreenCanvas | HTMLImageElement,
  ): void {
    context.filter = `brightness(${this.brightness}%) contrast(${this.contrast}%)`;
    context.drawImage(source, -source.width * 0.5, -source.height * 0.5);
  }

  protected onValueChange(): void {
    dispatch(EVENT.UPDATE_WORKAREA);
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
    this.brightnessControl.linkEvents();
    this.contrastControl.linkEvents();
    container.append(
      this.brightnessControl.element,
      this.contrastControl.element,
    );
  }

  private handleBrightnessControlChange = (newValue: number): void => {
    this.brightness = Number(newValue);
    this.onValueChange();
  };
  private handleContrastControlChange = (newValue: number): void => {
    this.contrast = Number(newValue);
    this.onValueChange();
  };
}
