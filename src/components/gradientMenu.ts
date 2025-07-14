import errorElement from "src/components/elements/errorElement";
import { GradientElement } from "src/components/elements/gradientElement";
import type { EventBus } from "src/utils/eventBus";
import getElementById from "src/utils/getElementById";
import type { IColorControl } from "./helpers/createColorControl";
import createColorControl from "./helpers/createColorControl";
import type { ISliderControl } from "./helpers/createSliderControl";
import createSliderControl from "./helpers/createSliderControl";

export class GradientMenu {
  private static instance: GradientMenu | null = null;
  private gradientSection: HTMLElement | null = null;
  private activeGradientElement: GradientElement | null = null;
  private gradientBar: HTMLDivElement | null = null;
  private alphaControl: ISliderControl | null = null;
  private portionControl: ISliderControl | null = null;
  private colorControl: IColorControl | null = null;
  private currentColorStop: {
    color: string;
    portion: number;
    alpha: number;
  } | null = null;
  private eventBus: EventBus;
  private onSelectElement: () => void;

  private constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.onSelectElement = this.handleSelectElement.bind(this);
    this.eventBus.on("edit:gradient", this.onSelectElement);
    this.eventBus.on("workarea:selectAt", () => this.unlinkDOMElements());
    this.createDOMElements();
  }

  private handleSelectElement(): void {
    const [selectedElements] = this.eventBus.request("workarea:selected:get");
    this.unlinkDOMElements();
    if (selectedElements.length === 1 && selectedElements[0] instanceof GradientElement) {
      this.activeGradientElement = selectedElements[0];
      this.linkDOMElements();
    }
  }

  private handlePortionControlChange = (newValue: number): void => {
    if (this.activeGradientElement && this.currentColorStop) {
      this.currentColorStop.portion = Number(newValue);
      this.eventBus.emit("workarea:update");
      this.updateGradientBar();
    }
  };

  private handleAlphaControlChange = (newValue: number): void => {
    if (this.activeGradientElement && this.currentColorStop) {
      this.currentColorStop.alpha = Number(newValue);
      this.eventBus.emit("workarea:update");
      this.updateGradientBar();
    }
  };

  private handleColorControlChange = (newValue: string): void => {
    if (this.activeGradientElement && this.currentColorStop) {
      this.currentColorStop.color = newValue;
      this.eventBus.emit("workarea:update");
      this.updateGradientBar();
    }
  };

  public static getInstance(eventBus: EventBus): GradientMenu {
    if (GradientMenu.instance === null) {
      GradientMenu.instance = new GradientMenu(eventBus);
    }
    return GradientMenu.instance;
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
      <h5 style="align-self: flex-start;">Gradiente:</h5>
      <div class='container column jc-sb g-05 pad-i-05'></div>
      <div id="gradient-bar"></div>
      <div id="color-stops-indicators"></div>
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
      false,
    );
    this.portionControl = createSliderControl(
      "inp_portion_position",
      "Posição",
      {
        min: 0.0,
        max: 1.0,
        step: 0.01,
        value: this.currentColorStop?.portion || 0,
      },
      this.handlePortionControlChange,
      false,
    );
    this.gradientSection.append(this.colorControl.element);
    this.gradientSection.append(this.portionControl.element);
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
      if (this.alphaControl && this.colorControl && this.portionControl) {
        this.alphaControl.unlinkEvents();
        this.alphaControl.updateValues(this.currentColorStop.alpha);
        this.alphaControl.linkEvents();
        this.colorControl.unlinkEvents();
        this.colorControl.updateValue(this.currentColorStop.color);
        this.colorControl.linkEvents();
        this.portionControl.unlinkEvents();
        this.portionControl.updateValues(this.currentColorStop.portion);
        this.portionControl.linkEvents();
      }
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = Number.parseInt(hex[1] + hex[2], 16);
    const g = Number.parseInt(hex[3] + hex[4], 16);
    const b = Number.parseInt(hex[5] + hex[6], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private linkDOMElements(): void {
    this.updateGradientBar();
    if (this.activeGradientElement) {
      this.currentColorStop = this.activeGradientElement.colorStops[0];
      this.alphaControl?.linkEvents();
      this.colorControl?.linkEvents();
      this.portionControl?.linkEvents();
    }
  }

  private unlinkDOMElements(): void {
    this.activeGradientElement = null;
    this.currentColorStop = null;
    this.alphaControl?.unlinkEvents();
    this.colorControl?.unlinkEvents();
    this.portionControl?.unlinkEvents();
  }
}
