import type { IColorControl } from "src/components/helpers/createColorControl";
import createColorControl from "src/components/helpers/createColorControl";
import type { ISliderControl } from "src/components/helpers/createSliderControl";
import createSliderControl from "src/components/helpers/createSliderControl";
import { Filter } from "src/filters/filter";
import { clamp } from "src/utils/easing";
import { toRadians } from "src/utils/transforms";

export class DropShadowFilter extends Filter {
  public set angle(value: number) {
    this.properties.set("angle", clamp(value, 0, 360));
  }
  public get angle(): number {
    return this.properties.get("angle") as number;
  }
  public set distance(value: number) {
    this.properties.set("distance", clamp(value, 0, 100));
  }
  public get distance(): number {
    return this.properties.get("distance") as number;
  }
  public set blur(value: number) {
    this.properties.set("blur", clamp(value, 0, 100));
  }
  public get blur(): number {
    return this.properties.get("blur") as number;
  }
  public set color(value: string) {
    this.properties.set("color", value ? (value as string) : "#000000");
  }
  public get color(): string {
    return this.properties.get("color") as string;
  }

  private angleControl: ISliderControl | null = null;
  private distanceControl: ISliderControl | null = null;
  private blurControl: ISliderControl | null = null;
  private colorControl: IColorControl | null = null;

  constructor() {
    super("drop-shadow", "Sombra", "before", 1);
    this.angle = 45;
    this.distance = 20;
    this.blur = 10;
    this.color = "#000000";
  }

  protected filterEffects(
    context: CanvasRenderingContext2D,
    elementToDraw: (ctx: CanvasRenderingContext2D) => void,
  ): void {
    // Desenha o elemento com sombra
    context.shadowColor = this.color;
    context.shadowBlur = this.blur;
    context.shadowOffsetX = this.distance * Math.sin(toRadians(this.angle));
    context.shadowOffsetY = this.distance * Math.cos(toRadians(this.angle));
    elementToDraw(context);
    // Reseta a sombra e apaga o elemento, deixando apenas a sombra
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.globalCompositeOperation = "destination-out";
    elementToDraw(context);
  }

  protected appendFilterControls(container: HTMLDivElement): void {
    this.angleControl = createSliderControl(
      `${this.id}-angle`,
      "Ângulo",
      { min: 0, max: 360, step: 1, value: this.angle },
      this.handleAngleControlChange,
    );

    this.distanceControl = createSliderControl(
      `${this.id}-distance`,
      "Distância",
      { min: 0, max: 100, step: 1, value: this.distance },
      this.handleDistanceControlChange,
    );

    this.blurControl = createSliderControl(
      `${this.id}-blur`,
      "Desfoque",
      { min: 0, max: 100, step: 1, value: this.blur },
      this.handleBlurControlChange,
    );

    this.colorControl = createColorControl(
      `${this.id}-color`,
      "Cor da Sombra",
      { value: this.color },
      this.handleColorControlChange,
    );

    this.angleControl.linkEvents();
    this.distanceControl.linkEvents();
    this.blurControl.linkEvents();
    this.colorControl.linkEvents();
    container.append(
      this.angleControl.element,
      this.distanceControl.element,
      this.blurControl.element,
      this.colorControl.element,
    );
  }

  private handleAngleControlChange = (newValue: number): void => {
    this.angle = Number(newValue);
    this.onChange();
  };
  private handleDistanceControlChange = (newValue: number): void => {
    this.distance = Number(newValue);
    this.onChange();
  };
  private handleBlurControlChange = (newValue: number): void => {
    this.blur = Number(newValue);
    this.onChange();
  };
  private handleColorControlChange = (newValue: string): void => {
    this.color = newValue;
    this.onChange();
  };
}

