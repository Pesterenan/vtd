import type { EventBus } from "src/utils/eventBus";
import type { IProjectData } from "../types";
import { Dialog } from "./dialog";
import type { ISliderControl } from "../helpers/createSliderControl";
import createSliderControl from "../helpers/createSliderControl";
import type { ITextInput } from "../helpers/createTextInput";
import createTextInput from "../helpers/createTextInput";
import type { ISelectInput } from "../helpers/createSelectInput";
import createSelectInput from "../helpers/createSelectInput";
import { templates } from "src/templates";

const WORK_AREA_WIDTH = 1920;
const WORK_AREA_HEIGHT = 1080;

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
    if (this.projectData) {
      this.projectData.workAreaSize.width = newValue;
    }
  }

  private handleHeightInput(newValue: number): void {
    if (this.projectData) {
      this.projectData.workAreaSize.height = newValue;
    }
  }

  private handleTemplateChange(newValue: string): void {
  if (!this.workAreaWidthInput || !this.workAreaHeightInput) {
    console.log("[DialogNewProject] ignorando mudança de template, sliders ainda não criados");
    return;
  }
    const tpl = templates.find((t) => t.name === newValue);
    if (!tpl) {
      console.warn("[DialogNewProject] Template não encontrado:", newValue);
      return;
    }

    const width = tpl.width;
    const height = tpl.height;
    this.workAreaWidthInput?.setValue(width);
    this.workAreaHeightInput?.setValue(height);
    this.handleWidthInput(width);
    this.handleHeightInput(height);

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
        optionValues: templates.map((t) => ({ value: t.name, label: t.name })),
        value: templates[0]?.name ?? "",
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
    const initialTemplateName = templates[0]?.name;
    if (initialTemplateName) {
      this.templatesInput?.setValue(initialTemplateName);
      this.handleTemplateChange(initialTemplateName);
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
