import EVENT from "../utils/customEvents";
import { Element } from "./element";
import { Filter, FilterProperty } from "./filter";
import { ImageElement } from "./imageElement";
import { TextElement } from "./textElement";
import { TElementData } from "./types";

export class DropShadowFilter extends Filter {
  public label = "Drop Shadow";
  public id = "drop-shadow";
  private angle = 45;
  private distance = 20;
  private blur = 10;
  private color = "#000000";
  private filterControls: HTMLDivElement | null = null;

  constructor() {
    super("before");
    this.createDOMElements();
  }

  apply<T extends TElementData>(
    context: CanvasRenderingContext2D,
    element: Element<T>,
  ): void {
    context.save();
    const radians = this.angle * (Math.PI / 180);
    context.globalAlpha = this.globalAlpha;
    context.shadowColor = this.color;
    context.shadowBlur = this.blur;
    context.shadowOffsetX = this.distance * Math.sin(radians);
    context.shadowOffsetY = this.distance * Math.cos(radians);
    if (element instanceof TextElement) {
      // Desenha cada linha de texto com deslocamento vertical
      let yOffset =
        -(element.content.length - 1) * element.lineVerticalSpacing * 0.5; // Centraliza verticalmente as linhas
      for (const line of element.content) {
        if (element.hasStroke) {
          context.strokeText(line, 0, yOffset);
        }
        if (element.hasFill) {
          context.fillText(line, 0, yOffset);
        }
        yOffset += element.lineVerticalSpacing;
      }
    }
    if (element instanceof ImageElement) {
      if (element.image) {
        context.globalAlpha = 1;
        context.drawImage(
          element.image,
          -element.size.width * 0.5,
          -element.size.height * 0.5,
          element.size.width,
          element.size.height,
        );
      }
    }
    context.restore();
  }

  modify(prop: FilterProperty): void {
    if (prop.key === "angle") {
      this.angle = Math.max(0, Math.min(prop.value as number, 360));
    }
    if (prop.key === "distance") {
      this.distance = Math.max(0, Math.min(prop.value as number, 100));
    }
    if (prop.key === "blur") {
      this.blur = Math.max(0, Math.min(prop.value as number, 100));
    }
    if (prop.key === "color") {
      this.color = prop.value ? (prop.value as string) : "#000000";
    }
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
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
      this.modify({ key: "angle", value: Number(angleInput.value) });
    });

    const distanceInput = this.filterControls.querySelector(
      `#${this.id}-distance`,
    ) as HTMLInputElement;
    distanceInput.addEventListener("input", () => {
      this.modify({ key: "distance", value: Number(distanceInput.value) });
    });

    const blurInput = this.filterControls.querySelector(
      `#${this.id}-blur`,
    ) as HTMLInputElement;
    blurInput.addEventListener("input", () => {
      this.modify({ key: "blur", value: Number(blurInput.value) });
    });

    const colorInput = this.filterControls.querySelector(
      `#${this.id}-color`,
    ) as HTMLInputElement;
    colorInput.addEventListener("input", () => {
      this.modify({ key: "color", value: colorInput.value });
    });
  }
}
