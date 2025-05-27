import { TextElement } from "src/components/elements/textElement";
import { WorkArea } from "src/components/workArea";
import EVENT, { dispatch } from "src/utils/customEvents";
import getElementById from "src/utils/getElementById";
import type { IColorControl } from "./helpers/createColorControl";
import { createColorControl } from "./helpers/createColorControl";
import type { ISliderControl } from "./helpers/createSliderControl";
import { createSliderControl } from "./helpers/createSliderControl";
import type { ITextElementData, SelectElementDetail } from "./types";
import IconAlignLeft from "../assets/icons/alignLeft.svg";
import IconAlignCenter from "../assets/icons/alignCenter.svg";
import IconAlignRight from "../assets/icons/alignRight.svg";

export class TextMenu {
  private static instance: TextMenu | null = null;
  private acceptButton: HTMLButtonElement | null = null;
  private activeTextElement: TextElement | null = null;
  private declineButton: HTMLButtonElement | null = null;
  private fillCheckbox: HTMLInputElement | null = null;
  private fillColorControl: IColorControl | null = null;
  private fontSelect: HTMLSelectElement | null = null;
  private lineHeightControl: ISliderControl | null = null;
  private originalText = "";
  private sizeControl: ISliderControl | null = null;
  private strokeCheckbox: HTMLInputElement | null = null;
  private strokeColorControl: IColorControl | null = null;
  private strokeWidthControl: ISliderControl | null = null;
  private textAlignRadios: HTMLInputElement[] | null = null;
  private textInput: HTMLTextAreaElement | null = null;
  private textMenuSection: HTMLElement;

  private constructor() {
    this.textMenuSection = document.createElement("section");
    this.createDOMElements();
    window.addEventListener(
      EVENT.SELECT_ELEMENT,
      this.handleSelectElement.bind(this),
    );
  }

  public static getInstance(): TextMenu {
    if (TextMenu.instance === null) {
      TextMenu.instance = new TextMenu();
    }
    return TextMenu.instance;
  }

  public getMenu(): HTMLElement {
    return this.textMenuSection;
  }

  private createDOMElements(): void {
    this.textMenuSection.id = "sec_text-menu";
    this.textMenuSection.className = "sec_menu-style";
    this.textMenuSection.innerHTML = `
<div class='container ai-jc-c'>
  <h5 style="align-self: flex-start;">Texto:</h5>
  <button id="btn_accept-text-changes" type="button">V</button>
  <button id="btn_decline-text-changes" type="button">X</button>
</div>
<div class='container column ai-jc-c'>
  <textarea id="inp_text-input" style="width: 100%; resize: none;"></textarea>
</div>
<div class='container ai-c jc-sb'>
  <label for="font-select">Fonte:</label>
  <select id="font-select" style="width: 80%">
    <option value="" />
    <option value="Arial">Arial</option>
    <option value="Impact">Impact</option>
  </select>
</div>
<div id="div_font-size-line-height" class='container ai-c jc-sb'></div>
<div class='container ai-c jc-sb'>
  <div id="div_fill-color" class='container ai-c jc-sb g-05'>
    <input id="chk_fill" type="checkbox"/>
  </div>
</div>
<div class='container ai-c jc-sb'>
  <div id="div_stroke-color" class='container ai-c jc-sb g-05'>
    <input id="chk_stroke" type="checkbox"/>
  </div>
</div>
<div class='container ai-c'>
  Alinhamento:
  <div class='container' style="border-radius: 0.25rem; background-color: var(--background-600);">
    <input id="align-left" name="text-align" class="tgl-common" type="radio" value="left"/>
    <label for="align-left" style="--checked-icon-url: url(${IconAlignLeft}); --icon-url: url(${IconAlignLeft});"></label>
    <input id="align-center" checked name="text-align" class="tgl-common" type="radio" value="center"/>
    <label for="align-center" style="--checked-icon-url: url(${IconAlignCenter}); --icon-url: url(${IconAlignCenter});"></label>
    <input id="align-right" name="text-align" class="tgl-common" type="radio" value="right"/>
    <label for="align-right" style="--checked-icon-url: url(${IconAlignRight}); --icon-url: url(${IconAlignRight});"></label>
  </div> 
</div>
`;
    this.textAlignRadios = Array.from(
      this.textMenuSection.querySelectorAll<HTMLInputElement>(
        'input[name="text-align"]',
      ),
    );
    this.fillColorControl = createColorControl(
      "fill-color-control",
      "Preenchimento",
      { value: this.activeTextElement?.fillColor || "#FFFFFF" },
      this.handleFillColorChange,
    );
    this.strokeColorControl = createColorControl(
      "stroke-color-control",
      "Contorno",
      { value: this.activeTextElement?.strokeColor || "#000000" },
      this.handleStrokeColorChange,
    );
    this.strokeWidthControl = createSliderControl(
      "stroke-width-control",
      "Espessura",
      {
        min: 1,
        max: 128,
        step: 1,
        value: this.activeTextElement?.strokeWidth || 3,
      },
      this.handleStrokeWidthChange,
      false,
    );
    this.sizeControl = createSliderControl(
      "font-size-control",
      "Tamanho",
      {
        min: 8,
        max: 250,
        step: 1,
        value: this.activeTextElement?.fontSize || 48,
      },
      this.handleFontSizeChange,
      false,
    );
    this.lineHeightControl = createSliderControl(
      "line-height-control",
      "Espaçamento",
      {
        min: 0.1,
        max: 10,
        step: 0.1,
        value: this.activeTextElement?.lineHeight || 1.2,
      },
      this.handleLineHeightChange,
      false,
    );
    this.textMenuSection
      .querySelector("#div_font-size-line-height")
      ?.append(this.sizeControl.element);
    this.textMenuSection
      .querySelector("#div_font-size-line-height")
      ?.append(this.lineHeightControl.element);
    this.textMenuSection
      .querySelector("#div_fill-color")
      ?.append(this.fillColorControl.element);
    this.textMenuSection
      .querySelector("#div_stroke-color")
      ?.append(this.strokeColorControl.element);
    this.textMenuSection
      .querySelector("#div_stroke-color")
      ?.append(this.strokeWidthControl.element);
  }

  private linkDOMElements(): void {
    this.originalText = this.activeTextElement?.content.join("\n") || "";

    this.textInput = getElementById<HTMLTextAreaElement>("inp_text-input");
    this.textInput.value = this.originalText;
    this.textInput.addEventListener("input", this.handleTextInput);

    this.fontSelect = getElementById<HTMLSelectElement>("font-select");
    this.fontSelect.value = this.activeTextElement?.font || "";
    this.fontSelect.addEventListener("change", this.handleFontChange);

    if (this.textAlignRadios)  {
      for (const radio of this.textAlignRadios) {
        radio.checked = radio.value === this.activeTextElement?.textAlign;
        radio.addEventListener("click", () => {
          if (radio.checked && this.activeTextElement) {
            this.activeTextElement.textAlign =
              radio.value as ITextElementData["textAlign"];
            dispatch(EVENT.UPDATE_WORKAREA);
          }
        });
      }
    }

    this.acceptButton = getElementById<HTMLButtonElement>(
      "btn_accept-text-changes",
    );
    this.acceptButton.addEventListener("click", this.handleAcceptTextChange);

    this.declineButton = getElementById<HTMLButtonElement>(
      "btn_decline-text-changes",
    );
    this.declineButton.addEventListener("click", this.handleDeclineTextChange);

    this.fillCheckbox = getElementById<HTMLInputElement>("chk_fill");
    this.fillCheckbox.checked = this.activeTextElement?.hasFill || false;
    this.fillCheckbox.addEventListener("change", this.handleFillChange);

    this.strokeCheckbox = getElementById<HTMLInputElement>("chk_stroke");
    this.strokeCheckbox.checked = this.activeTextElement?.hasStroke || false;
    this.strokeCheckbox.addEventListener("change", this.handleStrokeChange);

    if (this.activeTextElement) {
      if (this.sizeControl) {
        this.sizeControl.unlinkEvents();
        this.sizeControl.updateValues(this.activeTextElement.fontSize);
        this.sizeControl.linkEvents();
      }
      if (this.lineHeightControl) {
        this.lineHeightControl.unlinkEvents();
        this.lineHeightControl.updateValues(this.activeTextElement.lineHeight);
        this.lineHeightControl.linkEvents();
      }
      if (this.fillColorControl) {
        this.fillColorControl.unlinkEvents();
        this.fillColorControl.updateValue(this.activeTextElement.fillColor);
        this.fillColorControl.linkEvents();
      }
      if (this.strokeColorControl) {
        this.strokeColorControl.unlinkEvents();
        this.strokeColorControl.updateValue(this.activeTextElement.strokeColor);
        this.strokeColorControl.linkEvents();
      }
      if (this.strokeWidthControl) {
        this.strokeWidthControl.unlinkEvents();
        this.strokeWidthControl.updateValues(
          this.activeTextElement.strokeWidth,
        );
        this.strokeWidthControl.linkEvents();
      }
    }
  }

  private unlinkDOMElements(): void {
    this.textInput = getElementById<HTMLTextAreaElement>("inp_text-input");
    this.textInput.value = "";
    this.textInput.removeEventListener("input", this.handleTextInput);

    this.fontSelect = getElementById<HTMLSelectElement>("font-select");
    this.fontSelect.value = "";
    this.fontSelect.removeEventListener("change", this.handleFontChange);

    this.fillCheckbox = getElementById<HTMLInputElement>("chk_fill");
    this.fillCheckbox.checked = false;
    this.fillCheckbox.removeEventListener("change", this.handleFillChange);

    this.strokeCheckbox = getElementById<HTMLInputElement>("chk_stroke");
    this.strokeCheckbox.checked = false;
    this.strokeCheckbox.removeEventListener("change", this.handleStrokeChange);

    this.acceptButton = getElementById<HTMLButtonElement>(
      "btn_accept-text-changes",
    );
    this.acceptButton.removeEventListener("click", this.handleAcceptTextChange);

    this.declineButton = getElementById<HTMLButtonElement>(
      "btn_decline-text-changes",
    );
    this.declineButton.removeEventListener(
      "click",
      this.handleDeclineTextChange,
    );
    this.sizeControl?.unlinkEvents();
    this.lineHeightControl?.unlinkEvents();
    this.fillColorControl?.unlinkEvents();
    this.strokeColorControl?.unlinkEvents();
    this.strokeWidthControl?.unlinkEvents();
  }

  private handleSelectElement(evt: CustomEvent<SelectElementDetail>): void {
    const { elementsId } = evt.detail;
    const selectedElements = WorkArea.getInstance().getSelectedElements();
    this.unlinkDOMElements();
    if (
      elementsId.size === 1 &&
      selectedElements &&
      selectedElements[0] instanceof TextElement
    ) {
      this.activeTextElement = selectedElements[0];
      this.linkDOMElements();
    }
  }

  private handleFontChange = (evt: Event): void => {
    const selectedFont = (evt.target as HTMLSelectElement).value;
    if (this.activeTextElement && selectedFont)  {
      this.activeTextElement.font = selectedFont;
    }
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  private handleTextInput = (): void => {
    if (this.activeTextElement && this.textInput) {
      this.activeTextElement.content = this.textInput.value.split("\n");
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  };

  private handleFontSizeChange = (newValue: number): void => {
    if (this.activeTextElement) {
      this.activeTextElement.fontSize = Number.parseInt(String(newValue), 10);
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  };

  private handleLineHeightChange = (newValue: number): void => {
    if (this.activeTextElement) {
      this.activeTextElement.lineHeight = Number.parseFloat(String(newValue));
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  };

  private handleFillChange = (): void => {
    if (this.activeTextElement && this.fillCheckbox) {
      this.activeTextElement.hasFill = this.fillCheckbox.checked;
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  };

  private handleFillColorChange = (newValue: string): void => {
    if (this.activeTextElement) {
      this.activeTextElement.fillColor = newValue;
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  };

  private handleStrokeChange = (): void => {
    if (this.activeTextElement && this.strokeCheckbox) {
      this.activeTextElement.hasStroke = this.strokeCheckbox.checked;
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  };

  private handleStrokeColorChange = (newValue: string): void => {
    if (this.activeTextElement) {
      this.activeTextElement.strokeColor = newValue;
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  };

  private handleStrokeWidthChange = (newValue: number): void => {
    if (this.activeTextElement) {
      this.activeTextElement.strokeWidth = Number.parseFloat(String(newValue));
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  };

  private handleAcceptTextChange = (): void => {
    this.activeTextElement = null;
    this.unlinkDOMElements();
    dispatch(EVENT.UPDATE_WORKAREA);
  };

  private handleDeclineTextChange = (): void => {
    if (this.activeTextElement) {
      this.activeTextElement.content = this.originalText.split("\n");
      this.activeTextElement = null;
    }
    this.unlinkDOMElements();
    dispatch(EVENT.UPDATE_WORKAREA);
  };
}
