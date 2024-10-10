import EVENT from "src/utils/customEvents";
import { Filter } from "src/filters/filter";
import { clamp } from "src/utils/easing";
import type { IColorControl } from "src/components/helpers/createColorControl";
import { createColorControl } from "src/components/helpers/createColorControl";
import type { ISliderControl } from "src/components/helpers/createSliderControl";
import { createSliderControl } from "src/components/helpers/createSliderControl";

export class DropShadowFilter extends Filter {
  public set angle(value: number) {
    this.properties.set("angle", clamp(value, 0, 360));
    this.radians = this.angle * (Math.PI / 180);
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

  private filterControls: HTMLDivElement | null = null;
  private angleControl: ISliderControl | null = null;
  private distanceControl: ISliderControl | null = null;
  private blurControl: ISliderControl | null = null;
  private colorControl: IColorControl | null = null;
  private radians: number;

  constructor() {
    super("drop-shadow", "Sombra", "before");
    this.angle = 45;
    this.distance = 20;
    this.blur = 10;
    this.color = "#000000";
    this.radians = this.angle * (Math.PI / 180);
    this.createDOMElements();
  }

  apply(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    canvas: OffscreenCanvas | HTMLImageElement,
  ): void {
    context.save();
    context.globalAlpha = this.globalAlpha;
    context.shadowColor = this.color;
    context.shadowBlur = this.blur;
    context.shadowOffsetX = this.distance * Math.sin(this.radians);
    context.shadowOffsetY = this.distance * Math.cos(this.radians);
    context.drawImage(canvas, -canvas.width * 0.5, -canvas.height * 0.5);
    context.restore();
  }

  public deserialize(data: Partial<Filter>): void {
    super.deserialize(data);
    this.radians = this.angle * (Math.PI / 180);
    this.createDOMElements();
  }

  getFilterControls(): HTMLDivElement | null {
    return this.filterControls;
  }

  createDOMElements(): void {
    this.filterControls = document.createElement("div");
    this.filterControls.className = "sec_menu-style pad-05";
    this.filterControls.id = `${this.id}-filter-controls`;

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
    this.filterControls.append(
      this.angleControl.element,
      this.distanceControl.element,
      this.blurControl.element,
      this.colorControl.element,
    );
  }

  private handleAngleControlChange = (newValue: number): void => {
    if (this.angleControl) {
      this.angle = Number(newValue);
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };

  private handleDistanceControlChange = (newValue: number): void => {
    if (this.distanceControl) {
      this.distance = Number(newValue);
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };

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
