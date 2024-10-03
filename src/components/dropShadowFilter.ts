import EVENT from "../utils/customEvents";
import { Element } from "./element";
import { Filter, FilterProperty } from "./filter";
import { TextElement } from "./textElement";
import { TElementData } from "./types";

export class DropShadowFilter extends Filter {
  public label = "Drop Shadow";
  public id = "drop-shadow";
  private angle = 90;
  private distance = 50;
  private blur = 10;
  private color = "#000000";

  constructor() {
    super("before");
  }

  apply(
    context: CanvasRenderingContext2D,
    element: Element<TElementData>,
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
  }

  getHTML(): HTMLDivElement {
    const container = document.createElement("div");
    container.classList.add("filter-container");

    // Cria o slider para o ângulo
    const angleLabel = document.createElement("label");
    angleLabel.innerText = "Angle:";
    const angleInput = document.createElement("input");
    angleInput.type = "range";
    angleInput.min = "0";
    angleInput.max = "360";
    angleInput.value = this.angle.toString();
    angleInput.addEventListener("input", () => {
      this.modify({ key: "angle", value: Number(angleInput.value) });
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    });

    // Cria o slider para a distância
    const distanceLabel = document.createElement("label");
    distanceLabel.innerText = "Distance:";
    const distanceInput = document.createElement("input");
    distanceInput.type = "range";
    distanceInput.min = "0";
    distanceInput.max = "100";
    distanceInput.value = this.distance.toString();
    distanceInput.addEventListener("input", () => {
      this.modify({ key: "distance", value: Number(distanceInput.value) });
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    });

    // Cria o slider para o blur
    const blurLabel = document.createElement("label");
    blurLabel.innerText = "Blur:";
    const blurInput = document.createElement("input");
    blurInput.type = "range";
    blurInput.min = "0";
    blurInput.max = "100";
    blurInput.value = this.blur.toString();
    blurInput.addEventListener("input", () => {
      this.modify({ key: "blur", value: Number(blurInput.value) });
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    });

    // Cria o input de cor
    const colorLabel = document.createElement("label");
    colorLabel.innerText = "Color:";
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = this.color;
    colorInput.addEventListener("input", () => {
      this.modify({ key: "color", value: colorInput.value });
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    });

    // Monta o HTML
    container.appendChild(angleLabel);
    container.appendChild(angleInput);
    container.appendChild(distanceLabel);
    container.appendChild(distanceInput);
    container.appendChild(blurLabel);
    container.appendChild(blurInput);
    container.appendChild(colorLabel);
    container.appendChild(colorInput);

    return container;
  }
}
