import EVENT from "../utils/customEvents";
import getElementById from "../utils/getElementById";
import ErrorElement from "./errorElement";
import { TextElement } from "./textElement";
import { WorkArea } from "./workArea";

export class TextMenu {
  private static instance: TextMenu | null = null;
  private textMenuSection: HTMLElement | null = null;
  private textInput: HTMLTextAreaElement | null = null;
  private fontSize: HTMLInputElement | null = null;
  private lineHeight: HTMLInputElement | null = null;
  private fillColor: HTMLInputElement | null = null;
  private strokeColor: HTMLInputElement | null = null;
  private fillCheckbox: HTMLInputElement | null = null;
  private strokeCheckbox: HTMLInputElement | null = null;
  private acceptButton: HTMLButtonElement | null = null;
  private declineButton: HTMLButtonElement | null = null;
  private activeTextElement: TextElement | null = null;
  private originalText = "";

  private constructor() {
    this.createDOMElements();
    window.addEventListener(EVENT.CLEAR_WORKAREA, () => {
      console.log("closing text menu");
    });
    window.addEventListener(EVENT.SELECT_ELEMENT, (evt: Event) => {
      const customEvent = evt as CustomEvent<{ elementsId: Set<number> }>;
      const { elementsId } = customEvent.detail;
      if (elementsId.size !== 1) {
        this.unlinkDOMElements();
        return;
      }
      const selectedElements = WorkArea.getInstance().getSelectedElements();
      if (selectedElements && selectedElements[0] instanceof TextElement) {
        this.activeTextElement = selectedElements[0];
        this.linkDOMElements();
      }
    });
  }

  public static getInstance(): TextMenu {
    if (this.instance === null) {
      this.instance = new TextMenu();
    }
    return this.instance;
  }

  public getMenu(): HTMLElement {
    if (this.textMenuSection) {
      return this.textMenuSection;
    }
    return ErrorElement("Menu não instanciado");
  }

  private createDOMElements(): void {
    this.textMenuSection = document.createElement("section");
    this.textMenuSection.id = "sec_text-menu";
    this.textMenuSection.className = "sec_menu-style";
    this.textMenuSection.innerHTML = `
<p style="align-self: flex-start;">Texto:</p>
<div class='container jc-sb'>
  <div class='container ai-jc-c'>
    <textarea id="inp_text-input" style="resize: none;"></textarea>
  </div>
  <div class='container-column ai-jc-c'>
    <button id="btn_accept-text-changes" type="button">V</button>
    <button id="btn_decline-text-changes" type="button">X</button>
  </div>
</div>
<div class='container jc-sb' style="padding-inline: 0.5rem;">
  <label for="inp_font-size">Tamanho:</label>
  <input id="inp_font-size" class="number-input" type="number" style="width: 40px;"/>
  <label for="inp_font-spacing">Espaçamento:</label>
  <input id="inp_line-height" class="number-input" type="number" min="0.1" max="10" step="0.1" style="width: 40px;"/>
</div>
<div class='container ai-c jc-sb' style="padding-inline: 0.5rem;">
  <div class='container ai-c jc-sb g-05'>
    <input id="chk_fill" type="checkbox"/>
    <label for="inp_fill-color" style="display: inline-block; overflow: hidden; text-overflow: ellipsis;">
      Preenchimento:
    </label>
  </div>
  <input id="inp_fill-color" type="color"  value="#FFFFFF"style="width: 40px;"/>
</div>
<div class='container jc-sb' style="padding-inline: 0.5rem;">
  <div class='container ai-c jc-sb g-05'>
    <input id="chk_stroke" type="checkbox"/>
    <label for="inp_stroke-color">Contorno:</label>
  </div>
  <input id="inp_stroke-color" type="color" value="#000000" style="width: 40px;"/>
</div>
`;
  }

  private linkDOMElements(): void {
    this.originalText = this.activeTextElement?.content.join("\n") || "";
    this.textInput = getElementById<HTMLTextAreaElement>("inp_text-input");
    this.textInput.value = this.originalText;
    this.textInput.addEventListener("input", this.handleTextInput);

    this.fontSize = getElementById<HTMLInputElement>("inp_font-size");
    this.fontSize.value = this.activeTextElement?.fontSize.toString() || "16";
    this.fontSize.addEventListener("input", this.handleFontSizeChange);

    this.lineHeight = getElementById<HTMLInputElement>("inp_line-height");
    this.lineHeight.value =
      this.activeTextElement?.lineHeight.toString() || "1.2";
    this.lineHeight.addEventListener("input", this.handleLineHeightChange);

    this.fillColor = getElementById<HTMLInputElement>("inp_fill-color");
    this.fillColor.value = this.activeTextElement?.fillColor || "#000000";
    this.fillColor.addEventListener("input", this.handleFillColorChange);
    this.fillCheckbox = getElementById<HTMLInputElement>("chk_fill");
    this.fillCheckbox.checked = this.activeTextElement?.hasFill || false;
    this.fillCheckbox.addEventListener("change", this.handleFillChange);

    this.strokeColor = getElementById<HTMLInputElement>("inp_stroke-color");
    this.strokeColor.value = this.activeTextElement?.strokeColor || "#000000";
    this.strokeColor.addEventListener("input", this.handleStrokeColorChange);
    this.strokeCheckbox = getElementById<HTMLInputElement>("chk_stroke");
    this.strokeCheckbox.checked = this.activeTextElement?.hasStroke || false;
    this.strokeCheckbox.addEventListener("change", this.handleStrokeChange);

    this.acceptButton = getElementById<HTMLButtonElement>(
      "btn_accept-text-changes",
    );
    this.acceptButton.addEventListener("click", this.handleAcceptTextChange);

    this.declineButton = getElementById<HTMLButtonElement>(
      "btn_decline-text-changes",
    );
    this.declineButton.addEventListener("click", this.handleDeclineTextChange);
  }

  private unlinkDOMElements(): void {
    this.textInput = getElementById<HTMLTextAreaElement>("inp_text-input");
    this.textInput.value = "";
    this.textInput.removeEventListener("input", this.handleTextInput);

    this.fontSize = getElementById<HTMLInputElement>("inp_font-size");
    this.fontSize.value = "";
    this.fontSize.removeEventListener("input", this.handleFontSizeChange);

    this.lineHeight = getElementById<HTMLInputElement>("inp_line-height");
    this.lineHeight.value = "";
    this.lineHeight.removeEventListener("input", this.handleLineHeightChange);

    this.fillColor = getElementById<HTMLInputElement>("inp_fill-color");
    this.fillColor.value = "#FFFFFF";
    this.fillColor.removeEventListener("input", this.handleFillColorChange);
    this.fillCheckbox = getElementById<HTMLInputElement>("chk_fill");
    this.fillCheckbox.checked = false;
    this.fillCheckbox.removeEventListener("change", this.handleFillChange);

    this.strokeColor = getElementById<HTMLInputElement>("inp_stroke-color");
    this.strokeColor.value = "#000000";
    this.strokeColor.removeEventListener("input", this.handleStrokeColorChange);
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
  }

  private handleTextInput = (): void => {
    if (this.activeTextElement && this.textInput) {
      this.activeTextElement.content = this.textInput.value.split("\n");
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };

  private handleFontSizeChange = (): void => {
    if (this.activeTextElement && this.fontSize) {
      this.activeTextElement.fontSize = parseInt(this.fontSize.value, 10);
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };

  private handleLineHeightChange = (): void => {
    if (this.activeTextElement && this.lineHeight) {
      this.activeTextElement.lineHeight = parseFloat(this.lineHeight.value);
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };

  private handleFillChange = (): void => {
    if (this.activeTextElement && this.fillCheckbox) {
      this.activeTextElement.hasFill = this.fillCheckbox.checked;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };

  private handleFillColorChange = (): void => {
    if (this.activeTextElement && this.fillColor) {
      this.activeTextElement.fillColor = this.fillColor.value;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };

  private handleStrokeColorChange = (): void => {
    if (this.activeTextElement && this.strokeColor) {
      this.activeTextElement.strokeColor = this.strokeColor.value;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };

  private handleStrokeChange = (): void => {
    if (this.activeTextElement && this.strokeCheckbox) {
      this.activeTextElement.hasStroke = this.strokeCheckbox.checked;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  };

  private handleAcceptTextChange = (): void => {
    this.activeTextElement = null;
    this.unlinkDOMElements();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  };

  private handleDeclineTextChange = (): void => {
    if (this.activeTextElement) {
      console.log(this.originalText);
      this.activeTextElement.content = this.originalText.split("\n");
      this.activeTextElement = null;
    }
    this.unlinkDOMElements();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  };
}
