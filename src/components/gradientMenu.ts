import errorElement from "src/components/elements/errorElement";
import type { IGradientElementData } from "src/components/types";
import { GradientElement } from "src/components/elements/gradientElement";
import type { EventBus, SelectionChangedPayload } from "src/utils/eventBus";
import getElementById from "src/utils/getElementById";
import type { IColorControl } from "./helpers/createColorControl";
import createColorControl from "./helpers/createColorControl";
import type { ISliderControl } from "./helpers/createSliderControl";
import createSliderControl from "./helpers/createSliderControl";
import { MOUSE_BUTTONS } from "./types";
import {
  linearColorInterpolation,
  linearInterpolation,
} from "src/utils/easing";

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
  private gradientFormatSelect: HTMLSelectElement | null = null;

  private constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.eventBus.on("selection:changed", this.handleSelectElement);
    this.eventBus.on("edit:gradientUpdateColorStops", this.updateGradientBar);
    this.createDOMElements();
    this.unlinkDOMElements();
    this.eventBus.on("workarea:initialized", () => {
      this.gradientSection?.removeAttribute("disabled");
    });
    this.eventBus.on("workarea:clear", () => {
      this.gradientSection?.setAttribute("disabled", "true");
    });
  }

  public static getInstance(eventBus: EventBus): GradientMenu {
    if (GradientMenu.instance === null) {
      GradientMenu.instance = new GradientMenu(eventBus);
    }
    return GradientMenu.instance;
  }

  public getMenu(): HTMLElement {
    return (
      this.gradientSection || errorElement("Menu de Gradiente não instanciado")
    );
  }

  private createDOMElements = (): void => {
    this.gradientSection = document.createElement("section");
    this.gradientSection.id = "sec_gradient-menu";
    this.gradientSection.className = "sec_menu-style";
    this.gradientSection.setAttribute("disabled", "true");
    this.gradientSection.innerHTML = `
      <h5 style="align-self: flex-start;">Gradiente:</h5>
      <div class='container column jc-sb g-05 pad-i-05'></div>
      <div id="gradient-bar"></div>
      <div id="color-stops-indicators"></div>
      <div class='container ai-c jc-sb'>
        <label for="gradient-format-select">Formato:</label>
        <select id="gradient-format-select" style="width: 80%">
          <option value="conic">Cônico</option>
          <option value="linear" selected>Linear</option>
          <option value="radial">Radial</option>
        </select>
      </div>
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
  };

  private handleSelectElement = ({
    selectedElements,
  }: SelectionChangedPayload): void => {
    this.unlinkDOMElements();
    if (
      selectedElements?.length === 1 &&
      selectedElements[0] instanceof GradientElement
    ) {
      this.activeGradientElement = selectedElements[0];
      this.linkDOMElements();
    }
  };

  private linkDOMElements = (): void => {
    if (this.activeGradientElement) {
      this.currentColorStop = this.activeGradientElement.colorStops[0];
      this.alphaControl?.linkEvents();
      this.colorControl?.linkEvents();
      this.portionControl?.linkEvents();
      this.gradientFormatSelect = getElementById<HTMLSelectElement>(
        "gradient-format-select",
      );
      this.gradientFormatSelect.value =
        this.activeGradientElement.gradientFormat || "linear";
      this.gradientFormatSelect.disabled = false;
      this.gradientFormatSelect.addEventListener(
        "change",
        this.handleGradientFormatChange,
      );
      this.updateGradientBar();
      this.selectColorStop(0);
    }
  };

  private unlinkDOMElements = (): void => {
    this.activeGradientElement = null;
    this.currentColorStop = null;
    this.alphaControl?.unlinkEvents();
    this.colorControl?.unlinkEvents();
    this.portionControl?.unlinkEvents();
    this.gradientFormatSelect = getElementById<HTMLSelectElement>(
      "gradient-format-select",
    );
    this.gradientFormatSelect.value = "";
    this.gradientFormatSelect.disabled = true;
    this.gradientFormatSelect.removeEventListener(
      "change",
      this.handleGradientFormatChange,
    );
    if (this.gradientBar) {
      this.gradientBar.removeEventListener(
        "mousedown",
        this.handleAddColorStop,
      );
    }
    this.updateGradientBar();
  };

  private updateGradientBar = (): void => {
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
        indicator.dataset.index = String(index);

        indicator.addEventListener("mousedown", (event: MouseEvent) => {
          event.preventDefault();
          if (event.button === MOUSE_BUTTONS.RIGHT) {
            this.handleDeleteColorStop(index);
          }
          if (event.button === MOUSE_BUTTONS.LEFT) {
            this.handleDragColorStop(index);
          }
        });

        colorStopsIndicators.appendChild(indicator);
      });

      this.gradientBar.addEventListener("mousedown", this.handleAddColorStop);
    } else if (this.gradientBar && colorStopsIndicators) {
      this.gradientBar.style.backgroundImage = "";
      this.gradientBar.style.background = "white";
      this.gradientBar.removeEventListener(
        "mousedown",
        this.handleAddColorStop,
      );
      colorStopsIndicators.innerHTML = "";
    }
  };

  private handleDeleteColorStop = (index: number): void => {
    if (this.activeGradientElement) {
      if (
        index === 0 ||
        index === this.activeGradientElement.colorStops.length - 1
      )
        return;
      const colorStopToDelete = this.activeGradientElement.colorStops[index];
      this.activeGradientElement.colorStops =
        this.activeGradientElement.colorStops.filter(
          (cs) => cs.portion !== colorStopToDelete.portion,
        );
      this.currentColorStop = null;
      this.updateGradientBar();
      this.eventBus.emit("edit:gradientUpdateColorStops");
      this.eventBus.emit("workarea:update");
    }
  };

  private handleAddColorStop = (event: MouseEvent): void => {
    if (!this.activeGradientElement || !this.gradientBar) return;

    const bar = this.gradientBar as HTMLDivElement;
    const barRect = bar.getBoundingClientRect();
    const portion =
      Math.round(((event.clientX - barRect.left) / barRect.width) * 100) / 100;

    const { colorStops } = this.activeGradientElement;
    let leftStop = colorStops[0];
    let rightStop = colorStops[colorStops.length - 1];

    for (const stop of colorStops) {
      if (stop.portion === portion) return;
      if (stop.portion <= portion && stop.portion > leftStop.portion) {
        leftStop = stop;
      }
      if (stop.portion >= portion && stop.portion < rightStop.portion) {
        rightStop = stop;
      }
    }

    const newStop = {
      portion,
      color: linearColorInterpolation(
        leftStop.color,
        rightStop.color,
        (portion - leftStop.portion) / (rightStop.portion - leftStop.portion),
      ),
      alpha: linearInterpolation(
        leftStop.alpha,
        rightStop.alpha,
        (portion - leftStop.portion) / (rightStop.portion - leftStop.portion),
      ),
    };

    this.activeGradientElement.colorStops.push(newStop);
    this.activeGradientElement.sortColorStops();
    const indexOfNewColorStop = this.activeGradientElement.colorStops.indexOf(newStop);
    this.updateGradientBar();
    this.selectColorStop(indexOfNewColorStop);
    this.eventBus.emit("edit:gradientUpdateColorStops");
    this.eventBus.emit("workarea:update");
  };

  private handleDragColorStop = (index: number): void => {
    this.selectColorStop(index);
    if (
      index === 0 ||
      (this.activeGradientElement &&
        index === this.activeGradientElement.colorStops.length - 1)
    ) {
      return;
    }

    const bar = this.gradientBar as HTMLDivElement;
    const barRect = bar.getBoundingClientRect();

    const onMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      let newPortion =
        Math.round(((event.clientX - barRect.left) / barRect.width) * 100) /
        100;
      newPortion = Math.max(0, Math.min(1, newPortion));

      if (this.activeGradientElement) {
        const { colorStops } = this.activeGradientElement;
        const prevPortion = colorStops[index - 1].portion;
        const nextPortion = colorStops[index + 1].portion;

        newPortion = Math.max(prevPortion + 0.01, newPortion);
        newPortion = Math.min(nextPortion - 0.01, newPortion);

        this.activeGradientElement.colorStops[index].portion = newPortion;
        this.activeGradientElement.sortColorStops();
        this.updateGradientBar();
        this.portionControl?.updateValues(newPortion);
        this.eventBus.emit("workarea:update");
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      event.preventDefault();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  private selectColorStop = (index: number): void => {
    if (this.activeGradientElement) {
      this.currentColorStop = this.activeGradientElement.colorStops[index];
      if (this.alphaControl && this.colorControl && this.portionControl) {
        const isFirstOrLast =
          index === 0 ||
          index === this.activeGradientElement.colorStops.length - 1;
        this.portionControl.element.style.display = isFirstOrLast ? "none" : "";

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
  };

  private handleGradientFormatChange = (evt: Event): void => {
    const selectedFormat = (evt.target as HTMLSelectElement).value;
    if (this.activeGradientElement && selectedFormat) {
      this.activeGradientElement.gradientFormat =
        selectedFormat as IGradientElementData["gradientFormat"];
    }
    this.eventBus.emit("workarea:update");
  };

  private hexToRgba = (hex: string, alpha: number): string => {
    const r = Number.parseInt(hex[1] + hex[2], 16);
    const g = Number.parseInt(hex[3] + hex[4], 16);
    const b = Number.parseInt(hex[5] + hex[6], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  private handlePortionControlChange = (newValue: number): void => {
    if (this.activeGradientElement && this.currentColorStop) {
      const { colorStops } = this.activeGradientElement;
      const currentIndex = colorStops.findIndex(
        (stop) => stop === this.currentColorStop,
      );

      if (currentIndex === -1) return;

      const prevPortion = colorStops[currentIndex - 1]?.portion ?? -Infinity;
      const nextPortion = colorStops[currentIndex + 1]?.portion ?? Infinity;

      let newPortion = Number(newValue);
      newPortion = Math.max(prevPortion + 0.01, newPortion);
      newPortion = Math.min(nextPortion - 0.01, newPortion);

      this.currentColorStop.portion = newPortion;
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
}
