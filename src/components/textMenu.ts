import { TextElement } from "src/components/elements/textElement";
import getElementById from "src/utils/getElementById";
import type { IColorControl } from "./helpers/createColorControl";
import createColorControl from "./helpers/createColorControl";
import type { ISliderControl } from "./helpers/createSliderControl";
import createSliderControl from "./helpers/createSliderControl";
import type { ITextElementData } from "./types";

import IconAlignCenter from "../assets/icons/alignCenter.svg";
import IconAlignLeft from "../assets/icons/alignLeft.svg";
import IconAlignRight from "../assets/icons/alignRight.svg";

import IconFontStyleNormal from "../assets/icons/fontStyleNormal.svg";
import IconFontStyleOverline from "../assets/icons/fontStyleOverline.svg";
import IconFontStyleStrikeThrough from "../assets/icons/fontStyleStrikeThrough.svg";
import IconFontStyleUnderline from "../assets/icons/fontStyleUnderline.svg";

import IconFontWeightBold from "../assets/icons/fontWeightBold.svg";
import IconFontWeightBoldItalic from "../assets/icons/fontWeightBoldItalic.svg";
import IconFontWeightItalic from "../assets/icons/fontWeightItalic.svg";

import type { EventBus } from "src/utils/eventBus";
import createIconRadioButton from "./helpers/createIconRadioButton";

export class TextMenu {
  private static instance: TextMenu | null = null;
  private acceptButton: HTMLButtonElement | null = null;
  private activeTextElement: TextElement | null = null;
  private baseFonts = [
    "Arial",
    "Brush Script MT",
    "Courier New",
    "Garamond",
    "Georgia",
    "Impact",
    "Tahoma",
    "Times New Roman",
    "Trajan Pro",
    "Trebuchet MS",
    "Verdana",
  ] as const;
  private declineButton: HTMLButtonElement | null = null;
  private fillCheckbox: HTMLInputElement | null = null;
  private fillColorControl: IColorControl | null = null;
  private fontSelect: HTMLSelectElement | null = null;
  private fontStyleRadios: HTMLInputElement[] | null = null;
  private fontWeightRadios: HTMLInputElement[] | null = null;
  private lineHeightControl: ISliderControl | null = null;
  private originalText = "";
  private sizeControl: ISliderControl | null = null;
  private strokeCheckbox: HTMLInputElement | null = null;
  private strokeColorControl: IColorControl | null = null;
  private strokeWidthControl: ISliderControl | null = null;
  private textAlignRadios: HTMLInputElement[] | null = null;
  private textInput: HTMLTextAreaElement | null = null;
  private textMenuSection: HTMLElement;
  private eventBus: EventBus;
  private onSelectElement: () => void;
  private isTextSelected = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.onSelectElement = this.handleSelectElement.bind(this);
    this.eventBus.on("edit:acceptTextChange", this.handleAcceptTextChange);
    this.eventBus.on("edit:declineTextChange", this.handleDeclineTextChange);
    this.eventBus.on("edit:text", () => {
      this.isTextSelected = true;
      this.onSelectElement();
    });
    this.eventBus.on("workarea:selectById", this.onSelectElement);
    this.eventBus.on("workarea:selectAt", this.onSelectElement);
    this.textMenuSection = document.createElement("section");
    this.createDOMElements();
  }

  public static getInstance(eventBus: EventBus): TextMenu {
    if (TextMenu.instance === null) {
      TextMenu.instance = new TextMenu(eventBus);
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
<div class='container ai-c jc-sb'>
  Centralizar:
  <div id="text-align-container" class='container' style="border-radius: 0.25rem; background-color: var(--background-600);"></div> 
  Linha:
  <div id="font-style-container" class='container' style="border-radius: 0.25rem; background-color: var(--background-600);"></div> 
</div>
<div class='container ai-c jc-fe'>
  Estilo:
  <div id="font-weight-container" class='container' style="border-radius: 0.25rem; background-color: var(--background-600);"></div>
</div>
`;

    this.textMenuSection
      .querySelector("#text-align-container")
      ?.append(
        ...[
          createIconRadioButton(
            IconAlignLeft,
            "align-left",
            "text-align",
            "Esquerda",
            "left",
          ),
          createIconRadioButton(
            IconAlignCenter,
            "align-center",
            "text-align",
            "Centro",
            "center",
          ),
          createIconRadioButton(
            IconAlignRight,
            "align-right",
            "text-align",
            "Direita",
            "right",
          ),
        ],
      );

    this.textMenuSection
      .querySelector("#font-style-container")
      ?.append(
        ...[
          createIconRadioButton(
            IconFontStyleNormal,
            "style-normal",
            "font-style",
            "Sem Linha",
            "normal",
          ),
          createIconRadioButton(
            IconFontStyleOverline,
            "style-overline",
            "font-style",
            "Linha acima",
            "overline",
          ),
          createIconRadioButton(
            IconFontStyleStrikeThrough,
            "style-strikethrough",
            "font-style",
            "Linha através",
            "strike-through",
          ),
          createIconRadioButton(
            IconFontStyleUnderline,
            "style-underline",
            "font-style",
            "Linha abaixo",
            "underline",
          ),
        ],
      );

    this.textMenuSection
      .querySelector("#font-weight-container")
      ?.append(
        ...[
          createIconRadioButton(
            IconFontStyleNormal,
            "weight-normal",
            "font-weight",
            "Normal",
            "normal",
          ),
          createIconRadioButton(
            IconFontWeightBold,
            "weight-bold",
            "font-weight",
            "Negrito",
            "bold",
          ),
          createIconRadioButton(
            IconFontWeightItalic,
            "weight-italic",
            "font-weight",
            "Itálico",
            "italic",
          ),
          createIconRadioButton(
            IconFontWeightBoldItalic,
            "weight-bold-italic",
            "font-weight",
            "Negrito e Itálico",
            "bold italic",
          ),
        ],
      );

    this.textAlignRadios = Array.from(
      this.textMenuSection.querySelectorAll<HTMLInputElement>(
        'input[name="text-align"]',
      ),
    );
    this.fontStyleRadios = Array.from(
      this.textMenuSection.querySelectorAll<HTMLInputElement>(
        'input[name="font-style"]',
      ),
    );
    this.fontWeightRadios = Array.from(
      this.textMenuSection.querySelectorAll<HTMLInputElement>(
        'input[name="font-weight"]',
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
        min: 1,
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

    this.fontSelect = this.textMenuSection.querySelector("#font-select");
    if (this.fontSelect) {
      for (const font of this.baseFonts) {
        const fontOption = document.createElement("option");
        fontOption.value = font;
        fontOption.innerText = font;
        this.fontSelect.append(fontOption);
      }
    }

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
    this.textInput.disabled = false;
    this.textInput.addEventListener("input", this.handleTextInput);
    this.textInput.addEventListener("select", this.handleSelectTextInput);

    this.fontSelect = getElementById<HTMLSelectElement>("font-select");
    this.fontSelect.value = this.activeTextElement?.font || "";
    this.fontSelect.disabled = false;
    this.fontSelect.addEventListener("change", this.handleFontChange);

    if (this.textAlignRadios) {
      for (const radio of this.textAlignRadios) {
        radio.checked = radio.value === this.activeTextElement?.textAlign;
        radio.addEventListener("click", () => {
          if (radio.checked && this.activeTextElement) {
            this.activeTextElement.textAlign =
              radio.value as ITextElementData["textAlign"];
            this.eventBus.emit("workarea:update");
          }
        });
      }
    }

    if (this.fontStyleRadios) {
      for (const radio of this.fontStyleRadios) {
        radio.checked = radio.value === this.activeTextElement?.fontStyle;
        radio.addEventListener("click", () => {
          if (radio.checked && this.activeTextElement) {
            this.activeTextElement.fontStyle =
              radio.value as ITextElementData["fontStyle"];
            this.eventBus.emit("workarea:update");
          }
        });
      }
    }

    if (this.fontWeightRadios) {
      for (const radio of this.fontWeightRadios) {
        radio.checked = radio.value === this.activeTextElement?.fontWeight;
        radio.addEventListener("click", () => {
          if (radio.checked && this.activeTextElement) {
            this.activeTextElement.fontWeight =
              radio.value as ITextElementData["fontWeight"];
            this.eventBus.emit("workarea:update");
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
    if (this.isTextSelected) {
      this.textInput.select();
      this.isTextSelected = false;
    }
  }

  private unlinkDOMElements(): void {
    this.activeTextElement = null;
    this.textInput = getElementById<HTMLTextAreaElement>("inp_text-input");
    this.textInput.value = "";
    this.textInput.disabled = true;
    this.textInput.removeEventListener("input", this.handleTextInput);
    this.textInput.removeEventListener("select", this.handleSelectTextInput);

    this.fontSelect = getElementById<HTMLSelectElement>("font-select");
    this.fontSelect.value = "";
    this.fontSelect.disabled = true;
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

  private handleSelectElement(): void {
    const [selectedElements] = this.eventBus.request("workarea:selected:get");
    this.unlinkDOMElements();
    if (
      selectedElements.length === 1 &&
      selectedElements[0] instanceof TextElement
    ) {
      this.activeTextElement = selectedElements[0];
      this.linkDOMElements();
    }
  }

  private handleSelectTextInput = (evt: Event): void => {
    evt.preventDefault();
    (evt.target as HTMLTextAreaElement).focus();
    this.eventBus.emit("workarea:update");
  };

  private handleFontChange = (evt: Event): void => {
    const selectedFont = (evt.target as HTMLSelectElement).value;
    if (this.activeTextElement && selectedFont) {
      this.activeTextElement.font = selectedFont;
    }
    this.eventBus.emit("workarea:update");
  };

  private handleTextInput = (): void => {
    if (this.activeTextElement && this.textInput) {
      this.activeTextElement.content = this.textInput.value.split("\n");
      this.eventBus.emit("workarea:update");
    }
  };

  private handleFontSizeChange = (newValue: number): void => {
    if (this.activeTextElement) {
      this.activeTextElement.fontSize = Number.parseInt(String(newValue), 10);
      this.eventBus.emit("workarea:update");
    }
  };

  private handleLineHeightChange = (newValue: number): void => {
    if (this.activeTextElement) {
      this.activeTextElement.lineHeight = Number.parseFloat(String(newValue));
      this.eventBus.emit("workarea:update");
    }
  };

  private handleFillChange = (): void => {
    if (this.activeTextElement && this.fillCheckbox) {
      this.activeTextElement.hasFill = this.fillCheckbox.checked;
      this.eventBus.emit("workarea:update");
    }
  };

  private handleFillColorChange = (newValue: string): void => {
    if (this.activeTextElement) {
      this.activeTextElement.fillColor = newValue;
      this.eventBus.emit("workarea:update");
    }
  };

  private handleStrokeChange = (): void => {
    if (this.activeTextElement && this.strokeCheckbox) {
      this.activeTextElement.hasStroke = this.strokeCheckbox.checked;
      this.eventBus.emit("workarea:update");
    }
  };

  private handleStrokeColorChange = (newValue: string): void => {
    if (this.activeTextElement) {
      this.activeTextElement.strokeColor = newValue;
      this.eventBus.emit("workarea:update");
    }
  };

  private handleStrokeWidthChange = (newValue: number): void => {
    if (this.activeTextElement) {
      this.activeTextElement.strokeWidth = Number.parseFloat(String(newValue));
      this.eventBus.emit("workarea:update");
    }
  };

  private handleAcceptTextChange = (): void => {
    this.activeTextElement = null;
    this.unlinkDOMElements();
    this.eventBus.emit("workarea:selectAt", { firstPoint: null });
    this.eventBus.emit("workarea:update");
  };

  private handleDeclineTextChange = (): void => {
    if (this.activeTextElement) {
      this.activeTextElement.content = this.originalText.split("\n");
    }
    this.unlinkDOMElements();
    this.eventBus.emit("workarea:selectAt", { firstPoint: null });
    this.eventBus.emit("workarea:update");
  };
}
