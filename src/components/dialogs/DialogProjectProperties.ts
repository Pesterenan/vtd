import type { EventBus } from "src/utils/eventBus";
import { Dialog } from "./dialog";
import type { ISliderControl } from "../helpers/createSliderControl";
import createSliderControl from "../helpers/createSliderControl";
import type { ITextInput } from "../helpers/createTextInput";
import createTextInput from "../helpers/createTextInput";
import type { ISelectInput, ISelectOption } from "../helpers/createSelectInput";
import createSelectInput from "../helpers/createSelectInput";
import { OPTION_SEPARATOR_VALUE } from "src/constants";
import type { Size } from "../types";

// Keys for the template data
const T_480P_WIDE = "480p (SD wide)";
const T_720P_HD = "720p (HD)";
const T_900P_HD_PLUS = "900p (HD+)";
const T_1080P_FULL_HD = "Youtube Miniatura (Full HD)";
const T_INSTA_SQUARE = "Instagram Post (Quadrado)";
const T_INSTA_PORTRAIT = "Instagram Post (Retrato)";
const T_INSTA_LANDSCAPE = "Instagram Post (Paisagem)";
const T_FACEBOOK_POST = "Facebook Post";

const TEMPLATE_DATA: Record<string, { height: number; width: number }> = {
  [T_480P_WIDE]: { width: 854, height: 480 },
  [T_720P_HD]: { width: 1280, height: 720 },
  [T_900P_HD_PLUS]: { width: 1600, height: 900 },
  [T_1080P_FULL_HD]: { width: 1920, height: 1080 },
  [T_INSTA_SQUARE]: { width: 1080, height: 1080 },
  [T_INSTA_PORTRAIT]: { width: 1080, height: 1350 },
  [T_INSTA_LANDSCAPE]: { width: 1080, height: 566 },
  [T_FACEBOOK_POST]: { width: 1200, height: 630 },
};

const TEMPLATE_OPTIONS: Array<ISelectOption> = [
  { label: "Personalizado", value: "CUSTOM" },
  { label: "--- Padrões de Vídeo ---", value: OPTION_SEPARATOR_VALUE },
  { label: T_480P_WIDE, value: T_480P_WIDE },
  { label: T_720P_HD, value: T_720P_HD },
  { label: T_900P_HD_PLUS, value: T_900P_HD_PLUS },
  { label: T_1080P_FULL_HD, value: T_1080P_FULL_HD },
  { label: "--- Redes Sociais ---", value: OPTION_SEPARATOR_VALUE },
  { label: T_INSTA_SQUARE, value: T_INSTA_SQUARE },
  { label: T_INSTA_PORTRAIT, value: T_INSTA_PORTRAIT },
  { label: T_INSTA_LANDSCAPE, value: T_INSTA_LANDSCAPE },
  { label: T_FACEBOOK_POST, value: T_FACEBOOK_POST },
];

export interface IProjectProperties {
  title: string;
  size: Size;
}

export class DialogProjectProperties extends Dialog {
  private eventBus: EventBus;
  private workAreaWidthInput: ISliderControl | null = null;
  private workAreaHeightInput: ISliderControl | null = null;
  private projectNameInput: ITextInput | null = null;
  private templatesInput: ISelectInput | null = null;

  private currentTitle = "";
  private currentSize: Size = { width: 1920, height: 1080 };
  private lastSavedFile = "";
  private appVersion = "";

  constructor(eventBus: EventBus) {
    super({
      id: "project-properties-dialog",
      title: "Propriedades do Projeto",
      style: { minWidth: "25rem" },
    });
    this.eventBus = eventBus;
    this.eventBus.on("dialog:projectProperties:open", (payload) => {
      this.currentTitle = payload.title;
      this.currentSize = { ...payload.size };
      this.lastSavedFile = payload.lastSavedFile;
      this.appVersion = payload.appVersion;
      this.open();
    });
  }

  private handleNameInput(title: string): void {
    this.currentTitle = title;
  }

  private handleWidthInput(newValue: number): void {
    this.currentSize.width = newValue;
    this.templatesInput?.setValue("CUSTOM");
  }

  private handleHeightInput(newValue: number): void {
    this.currentSize.height = newValue;
    this.templatesInput?.setValue("CUSTOM");
  }

  private handleTemplateChange(newValue: string): void {
    const tpl = TEMPLATE_DATA[newValue];
    if (!tpl) return;
    const width = tpl.width;
    const height = tpl.height;
    this.workAreaWidthInput?.setValue(width);
    this.workAreaHeightInput?.setValue(height);
    this.currentSize.width = width;
    this.currentSize.height = height;
  }

  protected appendDialogContent(container: HTMLDivElement): void {
    container.className = "container column jc-c g-05";

    this.projectNameInput = createTextInput(
      "project-properties-name-input",
      "Nome do Projeto",
      { min: 0, max: 75, style: { width: "auto" }, value: this.currentTitle },
      (v) => this.handleNameInput(v),
    );

    this.workAreaWidthInput = createSliderControl(
      "inp_properties-width",
      "Largura",
      { min: 16, max: 4096, step: 1, value: this.currentSize.width },
      (v) => this.handleWidthInput(v),
      false,
    );

    this.workAreaHeightInput = createSliderControl(
      "inp_properties-height",
      "Altura",
      { min: 16, max: 4096, step: 1, value: this.currentSize.height },
      (v) => this.handleHeightInput(v),
      false,
    );

    this.templatesInput = createSelectInput(
      "properties-templates-input",
      "Templates",
      {
        optionValues: TEMPLATE_OPTIONS,
        style: {
          width: 'auto',
        },
        value: "CUSTOM",
      },
      (v) => this.handleTemplateChange(v),
    );

    const infoContainer = document.createElement("div");
    infoContainer.className = "container column g-025 mt-05";
    infoContainer.style.fontSize = "0.8rem";
    infoContainer.style.opacity = "0.7";

    const versionInfo = document.createElement("div");
    versionInfo.innerHTML = `<strong>Versão da aplicação:</strong> <span id="prop-app-version"></span>`;
    
    const fileInfo = document.createElement("div");
    fileInfo.style.wordBreak = "break-all";
    fileInfo.innerHTML = `<strong>Último arquivo salvo:</strong> <span id="prop-last-file"></span>`;

    infoContainer.appendChild(versionInfo);
    infoContainer.appendChild(fileInfo);

    container.appendChild(this.projectNameInput.element);
    container.appendChild(this.templatesInput.element);
    container.appendChild(this.workAreaWidthInput.element);
    container.appendChild(this.workAreaHeightInput.element);
    container.appendChild(infoContainer);
  }

  protected onOpen(): void {
    this.projectNameInput?.enable();
    this.workAreaWidthInput?.enable();
    this.workAreaHeightInput?.enable();
    this.templatesInput?.enable();

    this.projectNameInput?.setValue(this.currentTitle);
    this.workAreaWidthInput?.setValue(this.currentSize.width);
    this.workAreaHeightInput?.setValue(this.currentSize.height);
    this.templatesInput?.setValue("CUSTOM");

    const versionSpan = document.getElementById("prop-app-version");
    const fileSpan = document.getElementById("prop-last-file");
    if (versionSpan) versionSpan.textContent = this.appVersion;
    if (fileSpan) fileSpan.textContent = this.lastSavedFile || "Ainda não salvo";
  }

  protected onClose(): void {
    this.projectNameInput?.disable();
    this.workAreaWidthInput?.disable();
    this.workAreaHeightInput?.disable();
    this.templatesInput?.disable();
  }

  protected appendDialogActions(menu: HTMLMenuElement): void {
    const btnAccept = document.createElement("button");
    btnAccept.id = "btn_apply-properties";
    btnAccept.className = "btn-common-wide";
    btnAccept.textContent = "Aceitar";
    btnAccept.type = "button";
    btnAccept.addEventListener("click", () => {
      this.handleApplyProperties();
      this.close();
    });

    const btnCancel = document.createElement("button");
    btnCancel.id = "btn_cancel-properties";
    btnCancel.className = "btn-common-wide";
    btnCancel.textContent = "Cancelar";
    btnCancel.type = "button";
    btnCancel.addEventListener("click", () => {
      this.close();
    });
    menu.appendChild(btnAccept);
    menu.appendChild(btnCancel);
  }

  private handleApplyProperties(): void {
    this.eventBus.emit("workarea:updateProperties", {
      title: this.currentTitle,
      size: this.currentSize,
    });
  }
}
