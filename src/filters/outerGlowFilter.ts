import EVENT from "src/utils/customEvents";
import { Filter } from "src/filters/filter";

export class OuterGlowFilter extends Filter {
  public set blur(value: number) {
    this.setPropertyLimited("blur", value, 0, 100);
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
    this.filterControls.innerHTML = `
<label for="${this.id}-blur">Desfoque:</label>
<input id="${this.id}-blur" type="range" min="0" max="100" step="1" value="${this.blur.toString()}" />
<div class="container ai-jc-c g-05">
  <label for="${this.id}-color">Cor da Luz:</label>
  <input id="${this.id}-color" type="color" value="${this.color.toString()}" />
</div>
    `;

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
