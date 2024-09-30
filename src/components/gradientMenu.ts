import getElementById from "../utils/getElementById";
import EVENT from "../utils/customEvents";
import ErrorElement from "./errorElement";
import { GradientElement } from "./gradientElement";
import { WorkArea } from "./workArea";

export class GradientMenu {
  private static instance: GradientMenu | null = null;
  private gradientSection: HTMLElement | null = null;
  private activeGradientElement: GradientElement | null = null;
  private currentPortionColor: HTMLInputElement | null = null;
  private currentPortionAlpha: HTMLInputElement | null = null;

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
    if (this.activeGradientElement && this.currentPortionAlpha) {
      this.activeGradientElement.colorStops[0].alpha =
        Number(this.currentPortionAlpha.value) || 0.0;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };

  private handlePortionColorChange = (): void => {
    if (this.activeGradientElement && this.currentPortionColor) {
      this.activeGradientElement.colorStops[0].color =
        this.currentPortionColor.value;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
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
<div class='container jc-sb' style="padding-inline: 0.5rem;">
  <div>BARRA DE GRADIENTE</div>
</div>
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

  private linkDOMElements(): void {
    this.currentPortionColor =
      getElementById<HTMLInputElement>("inp_portion-color");
    this.currentPortionColor.value =
      this.activeGradientElement?.colorStops[0].color || "#FFFFFF";
    this.currentPortionColor.addEventListener(
      "input",
      this.handlePortionColorChange,
    );

    this.currentPortionAlpha =
      getElementById<HTMLInputElement>("inp_portion-alpha");
    this.currentPortionAlpha.value =
      this.activeGradientElement?.colorStops[0].alpha.toString() || "0.0";
    this.currentPortionAlpha.addEventListener(
      "input",
      this.handlePortionAlphaChange,
    );
  }

  private unlinkDOMElements(): void {
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
