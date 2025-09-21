import type { EventBus } from "src/utils/eventBus";
import type { IProjectData } from "../types";
import { Dialog } from "./dialog";
import type { ISliderControl } from "../helpers/createSliderControl";
import createSliderControl from "../helpers/createSliderControl";
import type { ITextInput } from "../helpers/createTextInput";
import createTextInput from "../helpers/createTextInput";
import type { ISelectInput, ISelectOption } from "../helpers/createSelectInput";
import createSelectInput from "../helpers/createSelectInput";
import { OPTION_SEPARATOR_VALUE } from "src/constants";

const WORK_AREA_WIDTH = 1920;
const WORK_AREA_HEIGHT = 1080;

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

export class DialogNewProject extends Dialog {
  private eventBus: EventBus;
  private projectData: IProjectData | null = null;
  private workAreaWidthInput: ISliderControl | null = null;
  private workAreaHeightInput: ISliderControl | null = null;
  private projectNameInput: ITextInput | null = null;
  private templatesInput: ISelectInput | null = null;

  constructor(eventBus: EventBus) {
    super({
      id: "new-project-dialog",
      title: "Criar Novo Projeto",
      style: { minWidth: "25rem" },
    });
    this.projectData = {
      createDate: "",
      elements: [],
      modifyDate: "",
      title: "Sem título",
      version: APP_VERSION,
      workAreaSize: { width: WORK_AREA_WIDTH, height: WORK_AREA_HEIGHT },
    };
    this.eventBus = eventBus;
    this.eventBus.on("dialog:newProject:open", () => this.open());
  }

  private handleNameInput(title: string): void {
    if (this.projectData) {
      this.projectData.title = title;
    }
  }

  private handleWidthInput(newValue: number): void {
    if (this.projectData && this.templatesInput) {
      this.projectData.workAreaSize.width = newValue;
      this.templatesInput.setValue("CUSTOM");
    }
  }

  private handleHeightInput(newValue: number): void {
    if (this.projectData && this.templatesInput) {
      this.projectData.workAreaSize.height = newValue;
      this.templatesInput.setValue("CUSTOM");
    }
  }

  private handleTemplateChange(newValue: string): void {
    const tpl = TEMPLATE_DATA[newValue];
    if (!tpl || !this.projectData) return;
    const width = tpl.width;
    const height = tpl.height;
    this.workAreaWidthInput?.setValue(width);
    this.workAreaHeightInput?.setValue(height);
    this.projectData.workAreaSize.width = width;
    this.projectData.workAreaSize.height = height;
  }

  protected appendDialogContent(container: HTMLDivElement): void {
    container.className = "container column jc-c g-05";

    this.projectNameInput = createTextInput(
      "project-name-input",
      "Nome do Projeto",
      { min: 0, max: 75, style: { width: "auto" }, value: "Sem título" },
      (v) => this.handleNameInput(v),
    );

    this.workAreaWidthInput = createSliderControl(
      "inp_workarea-width",
      "Largura",
      { min: 16, max: 4096, step: 1, value: WORK_AREA_WIDTH },
      (v) => this.handleWidthInput(v),
      false,
    );

    this.workAreaHeightInput = createSliderControl(
      "inp_workarea-height",
      "Altura",
      { min: 16, max: 4096, step: 1, value: WORK_AREA_HEIGHT },
      (v) => this.handleHeightInput(v),
      false,
    );

    this.templatesInput = createSelectInput(
      "templates-input",
      "Templates",
      {
        optionValues: TEMPLATE_OPTIONS,
        value: TEMPLATE_OPTIONS[0].value,
      },
      (v) => this.handleTemplateChange(v),
    );

    container.appendChild(this.projectNameInput.element);
    container.appendChild(this.templatesInput.element);
    container.appendChild(this.workAreaWidthInput.element);
    container.appendChild(this.workAreaHeightInput.element);
  }

  protected onOpen(): void {
    this.projectNameInput?.enable();
    this.workAreaWidthInput?.enable();
    this.workAreaHeightInput?.enable();
    this.templatesInput?.enable();

    // Apply initial template after controls are present + enabled.
    const initialTemplate = TEMPLATE_OPTIONS.find(
      (opt) => opt.value !== OPTION_SEPARATOR_VALUE,
    );
    if (initialTemplate) {
      this.templatesInput?.setValue(initialTemplate.value);
      this.handleTemplateChange(initialTemplate.value);
    }
  }

  protected onClose(): void {
    this.projectNameInput?.disable();
    this.workAreaWidthInput?.disable();
    this.workAreaHeightInput?.disable();
    this.templatesInput?.disable();
  }

  protected appendDialogActions(menu: HTMLMenuElement): void {
    const btnAccept = document.createElement("button");
    btnAccept.id = "btn_create-project";
    btnAccept.className = "btn-common-wide";
    btnAccept.textContent = "Aceitar";
    btnAccept.type = "button";
    btnAccept.addEventListener("click", () => {
      this.handleNewProject();
      this.close();
    });

    const btnCancel = document.createElement("button");
    btnCancel.id = "btn_cancel-project-creation";
    btnCancel.className = "btn-common-wide";
    btnCancel.textContent = "Cancelar";
    btnCancel.type = "button";
    btnCancel.addEventListener("click", () => {
      this.close();
    });
    menu.appendChild(btnAccept);
    menu.appendChild(btnCancel);
  }

  private handleNewProject(): void {
    if (this.projectData) {
      const now = new Date().toISOString();
      this.projectData.createDate = now;
      this.projectData.modifyDate = now;
    }
    this.eventBus.emit("workarea:createNewProject", {
      projectData: this.projectData as IProjectData,
    });
    this.eventBus.emit("workarea:initialized");
  }
}
