import getElementById from "src/utils/getElementById";
import EVENT from "src/utils/customEvents";
import errorElement from "src/components/elements/errorElement";
import { GradientElement } from "src/components/elements/gradientElement";
import { WorkArea } from "src/components/workArea";
import type { ISliderControl } from "./helpers/createSliderControl";
import { createSliderControl } from "./helpers/createSliderControl";
import type { IColorControl } from "./helpers/createColorControl";
import { createColorControl } from "./helpers/createColorControl";

export class GradientMenu {
  private static instance: GradientMenu | null = null;
  private gradientSection: HTMLElement | null = null;
  private activeGradientElement: GradientElement | null = null;
  private gradientBar: HTMLDivElement | null = null;
  private alphaControl: ISliderControl | null = null;
  private colorControl: IColorControl | null = null;
  private currentColorStop: {
    color: string;
    portion: number;
    alpha: number;
  } | null = null;

  private constructor() {
    this.createDOMElements();
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

  private handleAlphaControlChange = (newValue: number): void => {
    if (this.activeGradientElement && this.currentColorStop) {
      this.currentColorStop.alpha = Number(newValue);
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      this.updateGradientBar();
    }
  };

  private handleColorControlChange = (newValue: string): void => {
    if (this.activeGradientElement && this.currentColorStop) {
      this.currentColorStop.color = newValue;
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
    return errorElement("Menu não instanciado");
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
    `;
    this.colorControl = createColorControl(
      "inp_portion_color",
      "Cor",
      { value: this.currentColorStop?.color || "#FFFFFF" },
      this.handleColorControlChange,
    );
    this.alphaControl = createSliderControl(
      "inp_portion_alpha",
      "Alpha",
      {
        min: 0.0,
        max: 1.0,
        step: 0.01,
        value: this.currentColorStop?.alpha || 0,
      },
      this.handleAlphaControlChange,
    );
    this.gradientSection.append(this.colorControl.element);
    this.gradientSection.append(this.alphaControl.element);
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
      colorStopsIndicators.innerHTML = "";

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

        indicator.addEventListener("click", () => this.selectColorStop(index));

        colorStopsIndicators.appendChild(indicator);
      });
    }
  }

  private selectColorStop(index: number): void {
    if (this.activeGradientElement) {
      this.currentColorStop = this.activeGradientElement.colorStops[index];
      if (this.alphaControl && this.colorControl) {
        this.alphaControl.unlinkEvents();
        this.alphaControl.updateValues(this.currentColorStop.alpha);
        this.alphaControl.linkEvents();
        this.colorControl.unlinkEvents();
        this.colorControl.updateValue(this.currentColorStop.color);
        this.colorControl.linkEvents();
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
      this.alphaControl?.linkEvents();
      this.colorControl?.linkEvents();
    }
  }

  private unlinkDOMElements(): void {
    this.activeGradientElement = null;
    this.currentColorStop = null;
    this.alphaControl?.unlinkEvents();
    this.colorControl?.unlinkEvents();
  }
}
