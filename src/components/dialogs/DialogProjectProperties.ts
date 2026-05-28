import type { EventBus } from "src/utils/eventBus";
import { Dialog } from "./dialog";
import type { ISliderControl } from "../helpers/createSliderControl";
import createSliderControl from "../helpers/createSliderControl";
import type { ISelectInput } from "../helpers/createSelectInput";
import createSelectInput from "../helpers/createSelectInput";
import type { Size } from "../types";
import { TEMPLATE_DATA, TEMPLATE_OPTIONS } from "src/constants";
import { version as APP_VERSION } from "../../../package.json";

export interface IProjectProperties {
  title: string;
  size: Size;
}

export class DialogProjectProperties extends Dialog {
  private eventBus: EventBus;
  private workAreaWidthInput: ISliderControl | null = null;
  private workAreaHeightInput: ISliderControl | null = null;
  private templatesInput: ISelectInput | null = null;

  private currentTitle = "";
  private currentSize: Size = { width: 1920, height: 1080 };
  private appVersion = APP_VERSION;
  private currentFilePath: string | null = null;

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
      this.currentFilePath = payload.filePath ?? null;
      this.open();
    });
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

    const fileInfo = document.createElement("div");
    fileInfo.innerHTML = `<strong>Arquivo:</strong> <span id="prop-file-name"></span>`;

    const versionInfo = document.createElement("div");
    versionInfo.innerHTML = `<strong>Versão da aplicação:</strong> ${this.appVersion}`;

    infoContainer.appendChild(fileInfo);
    infoContainer.appendChild(versionInfo);

    container.appendChild(this.templatesInput.element);
    container.appendChild(this.workAreaWidthInput.element);
    container.appendChild(this.workAreaHeightInput.element);
    container.appendChild(infoContainer);
  }

  protected onOpen(): void {
    this.workAreaWidthInput?.enable();
    this.workAreaHeightInput?.enable();
    this.templatesInput?.enable();

    this.workAreaWidthInput?.setValue(this.currentSize.width);
    this.workAreaHeightInput?.setValue(this.currentSize.height);
    this.templatesInput?.setValue("CUSTOM");

    const fileInfo = this.dialogContent?.querySelector("#prop-file-name");
    if (fileInfo) {
      fileInfo.textContent = this.currentFilePath
        ? this.currentFilePath.split(/[/\\]/).pop() ?? "Ainda não salvo"
        : "Ainda não salvo";
    }
  }

  protected onClose(): void {
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
