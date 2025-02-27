import getElementById from "src/utils/getElementById";
import { GradientMenu } from "src/components/gradientMenu";
import { LayersMenu } from "src/components/layersMenu";
import { TextMenu } from "src/components/textMenu";
import { WorkArea } from "src/components/workArea";
import { SIDE_MENU_WIDTH } from "src/constants";
import { TransformMenu } from "./transformMenu";

export class SideMenu {
  private static instance: SideMenu | null = null;
  private sideMenu?: HTMLMenuElement;
  private layersMenu: HTMLElement | null = null;
  private gradientMenu: HTMLElement | null = null;
  private textMenu: HTMLElement | null = null;
  private transformMenu: HTMLElement | null = null;

  constructor() {
    this.createDOMElements();
  }

  private createHR(): HTMLHRElement {
    const horizontalDivider = document.createElement("hr");
    horizontalDivider.setAttribute("style", "width: 100%;");
    return horizontalDivider;
  }

  private createDOMElements(): void {
    const mainWindow = getElementById<HTMLDivElement>("main-window");
    this.sideMenu = document.createElement("menu");
    this.sideMenu.id = "side-menu";
    this.sideMenu.className = "side-menu";
    this.sideMenu.setAttribute("style", `width: ${SIDE_MENU_WIDTH}px;`);
    const domElements: HTMLElement[] = [];

    const importImageBtn = document.createElement("button");
    importImageBtn.id = "btn_import-image";
    importImageBtn.innerText = "Importar Imagem";
    importImageBtn.className = "btn-common";
    importImageBtn.addEventListener("click", () => window.api.loadImage());
    domElements.push(importImageBtn);

    const exportImageBtn = document.createElement("button");
    exportImageBtn.id = "btn_export-image";
    exportImageBtn.innerText = "Exportar Imagem";
    exportImageBtn.className = "btn-common";
    exportImageBtn.addEventListener("click", () =>
      window.api.exportCanvas(WorkArea.getInstance().exportCanvas()),
    );
    domElements.push(exportImageBtn);

    const addElementBtn = document.createElement("button");
    addElementBtn.id = "btn_add-element";
    addElementBtn.innerText = "Adicionar Elemento";
    addElementBtn.className = "btn-common";
    addElementBtn.addEventListener("click", () =>
      WorkArea.getInstance().addElement(),
    );
    domElements.push(addElementBtn);

    const saveProjectBtn = document.createElement("button");
    saveProjectBtn.id = "btn_save-project";
    saveProjectBtn.innerText = "Salvar Projeto";
    saveProjectBtn.className = "btn-common";
    saveProjectBtn.addEventListener("click", () => {
      const projectData = WorkArea.getInstance().saveProject();
      window.api.saveProject(projectData);
    });

    const loadProjectBtn = document.createElement("button");
    loadProjectBtn.id = "btn_load-project";
    loadProjectBtn.innerText = "Carregar Projeto";
    loadProjectBtn.className = "btn-common";
    loadProjectBtn.addEventListener("click", () => {
      window.api.loadProject();
    });

    const projectOptionsDiv = document.createElement("div");
    projectOptionsDiv.className = 'container jc-sb g-1 pad-b-05';
    projectOptionsDiv.append(saveProjectBtn, loadProjectBtn);
    domElements.push(projectOptionsDiv);

    const openVideoBtn = document.createElement("button");
    openVideoBtn.id = "btn_open-video";
    openVideoBtn.innerText = "Open Video";
    openVideoBtn.className = "btn-common";
    openVideoBtn.onclick = (): void => {
      window.api.loadVideo();
    };
    domElements.push(openVideoBtn);
    domElements.push(this.createHR());

    this.transformMenu = TransformMenu.getInstance().getMenu();
    domElements.push(this.transformMenu);
    domElements.push(this.createHR());

    this.layersMenu = LayersMenu.getInstance().getMenu();
    domElements.push(this.layersMenu);
    domElements.push(this.createHR());

    this.textMenu = TextMenu.getInstance().getMenu();
    domElements.push(this.textMenu);
    domElements.push(this.createHR());

    this.gradientMenu = GradientMenu.getInstance().getMenu();
    domElements.push(this.gradientMenu);
    domElements.push(this.createHR());

    // APPEND ELEMENTS TO SIDE MENU:
    this.sideMenu.append(...domElements);

    if (mainWindow) {
      mainWindow.appendChild(this.sideMenu);
    }
  }

  public static getInstance(): SideMenu {
    if (this.instance === null) {
      this.instance = new SideMenu();
    }
    return this.instance;
  }
}
