import EVENT from "../utils/customEvents";
import { Filter } from "./filter";

export class DropShadowFilter extends Filter {
  public set angle(value: number) {
    this.setPropertyLimited("angle", value, 0, 360);
    this.radians = this.angle * (Math.PI / 180);
  }
  public get angle(): number {
    return this.properties.get("angle") as number;
  }
  public set distance(value: number) {
    this.setPropertyLimited("distance", value, 0, 100);
  }
  public get distance(): number {
    return this.properties.get("distance") as number;
  }
  public set blur(value: number) {
    this.setPropertyLimited("blur", value, 0, 100);
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

  apply(context: CanvasRenderingContext2D): void {
    context.save();
    context.globalAlpha = this.globalAlpha;
    context.shadowColor = this.color;
    context.shadowBlur = this.blur;
    context.shadowOffsetX = this.distance * Math.sin(this.radians);
    context.shadowOffsetY = this.distance * Math.cos(this.radians);
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
    this.filterControls.innerHTML = `
<label for="${this.id}-angle">Ângulo:</label>
<input id="${this.id}-angle" type="range" min="0" max="360" step="1" value="${this.angle.toString()}" />
<label for="${this.id}-distance">Distância:</label>
<input id="${this.id}-distance" type="range" min="0" max="100" step="1" value="${this.distance.toString()}" />
<label for="${this.id}-blur">Desfoque:</label>
<input id="${this.id}-blur" type="range" min="0" max="100" step="1" value="${this.blur.toString()}" />
<div class="container ai-jc-c g-05">
  <label for="${this.id}-color">Cor da Sombra:</label>
  <input id="${this.id}-color" type="color" value="${this.color.toString()}" />
</div>
    `;

    const angleInput = this.filterControls.querySelector(
      `#${this.id}-angle`,
    ) as HTMLInputElement;
    angleInput.addEventListener("input", () => {
      this.angle = Number(angleInput.value);
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    });

    const distanceInput = this.filterControls.querySelector(
      `#${this.id}-distance`,
    ) as HTMLInputElement;
    distanceInput.addEventListener("input", () => {
      this.distance = Number(distanceInput.value);
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    });

    const blurInput = this.filterControls.querySelector(
      `#${this.id}-blur`,
    ) as HTMLInputElement;
    blurInput.addEventListener("input", () => {
      this.blur = Number(blurInput.value);
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    });

    const colorInput = this.filterControls.querySelector(
      `#${this.id}-color`,
    ) as HTMLInputElement;
    colorInput.addEventListener("input", () => {
      this.color = colorInput.value;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    });
  }
}
