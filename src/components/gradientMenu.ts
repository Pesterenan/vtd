import getElementById from "../utils/getElementById";
import EVENT from "../utils/customEvents";
import ErrorElement from "./errorElement";
import { GradientElement } from "./gradientElement";
import { WorkArea } from "./workArea";

export class GradientMenu {
  private static instance: GradientMenu | null = null;
  private gradientSection: HTMLElement | null = null;
  private activeGradientElement: GradientElement | null = null;
  private gradientBar: HTMLDivElement | null = null;
  private currentPortionColor: HTMLInputElement | null = null;
  private currentPortionAlpha: HTMLInputElement | null = null;
  private currentColorStop: {
    color: string;
    portion: number;
    alpha: number;
  } | null = null;

  private constructor() {
    this.createDOMElements();
    window.addEventListener(EVENT.CLEAR_WORKAREA, () => {
      console.log("closing gradient menu");
    });
    window.addEventListener(EVENT.SELECT_ELEMENT, (evt: Event) => {
      const customEvent = evt as CustomEvent<{ elementsId: Set<number> }>;
      const { elementsId } = customEvent.detail;
      if (elementsId.size !== 1) {
        this.unlinkDOMElements();
        return;
      }
      const selectedElements = WorkArea.getInstance().getSelectedElements();
      if (selectedElements && selectedElements[0] instanceof GradientElement) {
        this.activeGradientElement = selectedElements[0];
        this.linkDOMElements();
      }
    });
  }

  private handlePortionAlphaChange = (): void => {
    if (
      this.activeGradientElement &&
      this.currentColorStop &&
      this.currentPortionAlpha
    ) {
      this.currentColorStop.alpha =
        Number(this.currentPortionAlpha.value) || 0.0;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      this.updateGradientBar();
    }
  };

  private handlePortionColorChange = (): void => {
    if (
      this.activeGradientElement &&
      this.currentColorStop &&
      this.currentPortionColor
    ) {
      this.currentColorStop.color = this.currentPortionColor.value;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      this.updateGradientBar();
    }
  };

  public static getInstance(): GradientMenu {
    if (this.instance === null) {
      this.instance = new GradientMenu();
    }
    return this.instance;
  }

  public getMenu(): HTMLElement {
    if (this.gradientSection) {
      return this.gradientSection;
    }
    return ErrorElement("Menu não instanciado");
  }

  private createDOMElements(): void {
    this.gradientSection = document.createElement("section");
    this.gradientSection.id = "sec_gradient-menu";
    this.gradientSection.className = "sec_menu-style";
    this.gradientSection.innerHTML = `
<p style="align-self: flex-start;">Gradiente:</p>
<div class='container-column jc-sb g-05' style="padding-inline: 0.5rem;">
  <div id="gradient-bar" style="width: 100%; height: 20px; background: #FFFFFF;"></div>
  <div id="color-stops-indicators" style="position: relative; height: 10px;"></div>
<div class='container ai-c jc-sb' style="padding-inline: 0.5rem;">
  <div class='container ai-c jc-sb g-05'>
    <label for="inp_portion-color">Cor:</label>
    <input id="inp_portion-color" type="color" value="#000000" style="width: 40px;"/>
  </div>
  <div class='container ai-c jc-sb g-05'>
    <label for="inp_portion-alpha">Alpha:</label>
    <input
      id="inp_portion-alpha"
      class="number-input"
      type="number"
      min="0.0"
      max="1.0"
      step="0.05"
      style="width: 50px;"
      value="1.0"/>
  </div>
</div>
    `;
  }

  private updateGradientBar(): void {
    this.gradientBar = getElementById<HTMLDivElement>("gradient-bar");
    const colorStopsIndicators = getElementById<HTMLDivElement>(
      "color-stops-indicators",
    );
    if (this.activeGradientElement && this.gradientBar) {
      const colorStops = this.activeGradientElement.colorStops
        .map((stop) => {
          const { color, alpha, portion } = stop;
          const rgbaColor = this.hexToRgba(color, alpha);
          return `${rgbaColor} ${portion * 100}%`;
        })
        .join(", ");
      this.gradientBar.style.backgroundImage = `linear-gradient(to right, ${colorStops})`;
      // Limpar indicadores anteriores
      colorStopsIndicators.innerHTML = "";

      // Adicionar novos indicadores
      this.activeGradientElement.colorStops.forEach((stop, index) => {
        const indicator = document.createElement("div");
        indicator.className = "color-stop-indicator";
        indicator.style.position = "absolute";
        indicator.style.left = `${stop.portion * 100}%`;
        indicator.style.transform = "translateX(-50%)";
        indicator.style.width = "10px";
        indicator.style.height = "10px";
        indicator.style.background = stop.color;
        indicator.style.borderRadius = "50%";
        indicator.style.cursor = "pointer";

        // Selecionar o colorStop ao clicar no indicador
        indicator.addEventListener("click", () => this.selectColorStop(index));

        colorStopsIndicators.appendChild(indicator);
      });
    }
  }

  private selectColorStop(index: number): void {
    if (this.activeGradientElement) {
      this.currentColorStop = this.activeGradientElement.colorStops[index];
      if (this.currentPortionColor && this.currentPortionAlpha) {
        this.currentPortionColor.value = this.currentColorStop.color;
        this.currentPortionAlpha.value = this.currentColorStop.alpha.toString();
      }
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex[1] + hex[2], 16);
    const g = parseInt(hex[3] + hex[4], 16);
    const b = parseInt(hex[5] + hex[6], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private linkDOMElements(): void {
    this.updateGradientBar();
    if (this.activeGradientElement) {
      this.currentColorStop = this.activeGradientElement.colorStops[0];
      this.currentPortionColor =
        getElementById<HTMLInputElement>("inp_portion-color");
      this.currentPortionColor.value = this.currentColorStop.color;
      this.currentPortionColor.addEventListener(
        "input",
        this.handlePortionColorChange,
      );

      this.currentPortionAlpha =
        getElementById<HTMLInputElement>("inp_portion-alpha");
      this.currentPortionAlpha.value = this.currentColorStop.alpha.toString();
      this.currentPortionAlpha.addEventListener(
        "input",
        this.handlePortionAlphaChange,
      );
    }
  }

  private unlinkDOMElements(): void {
    this.activeGradientElement = null;
    this.currentColorStop = null;
    this.currentPortionColor =
      getElementById<HTMLInputElement>("inp_portion-color");
    this.currentPortionColor.value = "#FFFFFF";
    this.currentPortionColor.removeEventListener(
      "input",
      this.handlePortionColorChange,
    );

    this.currentPortionAlpha =
      getElementById<HTMLInputElement>("inp_portion-alpha");
    this.currentPortionAlpha.value = "1.0";
    this.currentPortionAlpha.removeEventListener(
      "input",
      this.handlePortionAlphaChange,
    );
  }
}
