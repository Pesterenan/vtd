import type { EventBus } from "src/utils/eventBus";
import type { IProjectData } from "../types";
import { Dialog } from "./dialog";
import type { ISliderControl } from "../helpers/createSliderControl";
import createSliderControl from "../helpers/createSliderControl";
import type { ITextInput } from "../helpers/createTextInput";
import createTextInput from "../helpers/createTextInput";

export class DialogNewProject extends Dialog {
  private eventBus: EventBus;
  private projectData: IProjectData | null = null;
  private workAreaWidthInput: ISliderControl | null = null;
  private workAreaHeightInput: ISliderControl | null = null;
  private projectNameInput: ITextInput | null = null;

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
      version: "0.0.1",
      workAreaSize: { width: 640, height: 480 },
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

  protected appendDialogContent(container: HTMLDivElement): void {
    container.className = "container column ai-c-jc g-05";

    this.projectNameInput = createTextInput(
      "project-name-input",
      "Nome do Projeto",
      { min: 0, max: 75 },
      this.handleNameInput.bind(this),
    );
    this.workAreaWidthInput = createSliderControl(
      "inp_workarea-width",
      "Largura",
      { min: 16, max: 4096, step: 1, value: 1920 },
      this.handleWidthInput.bind(this),
      false,
    );
    this.workAreaHeightInput = createSliderControl(
      "inp_workarea-width",
      "Altura",
      { min: 16, max: 4096, step: 1, value: 1080 },
      this.handleHeightInput.bind(this),
      false,
    );

    this.projectNameInput.linkEvents();
    this.workAreaWidthInput.linkEvents();
    this.workAreaHeightInput.linkEvents();

    container.appendChild(this.projectNameInput.element);
    container.appendChild(this.workAreaWidthInput.element);
    container.appendChild(this.workAreaHeightInput.element);
  }

  protected onClose(): void {
    this.projectNameInput?.unlinkEvents();
    this.workAreaWidthInput?.unlinkEvents();
    this.workAreaHeightInput?.unlinkEvents();
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
      window.api.setWindowTitle(this.projectData.title);
    }
    this.eventBus.emit("workarea:createNewProject", {
      projectData: this.projectData as IProjectData,
    });
  }
}
