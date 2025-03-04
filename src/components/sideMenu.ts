import getElementById from "src/utils/getElementById";
import { GradientMenu } from "src/components/gradientMenu";
import { LayersMenu } from "src/components/layersMenu";
import { TextMenu } from "src/components/textMenu";
import { WorkArea } from "src/components/workArea";
import { SIDE_MENU_WIDTH } from "src/constants";
import { TransformMenu } from "./transformMenu";
import importImageIconSrc from "src/assets/icons/import-image.svg";
import exportImageIconSrc from "src/assets/icons/export-image.svg";
import saveProjectIconSrc from "src/assets/icons/save-project.svg";
import loadProjectIconSrc from "src/assets/icons/load-project.svg";
import extractVideoIconSrc from "src/assets/icons/extract-video.svg";

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

  private createDOMElements(): void {
    const mainWindow = getElementById<HTMLDivElement>("main-window");
    this.sideMenu = document.createElement("menu");
    this.sideMenu.id = "side-menu";
    this.sideMenu.className = "side-menu";
    this.sideMenu.setAttribute("style", `width: ${SIDE_MENU_WIDTH}px;`);
    const domElements: HTMLElement[] = [];

    const importImageBtn = document.createElement("button");
    importImageBtn.id = "btn_import-image";
    importImageBtn.className = "btn-common";
    const importImageIcon = document.createElement("img");
    importImageIcon.alt = "Importar Imagem";
    importImageIcon.src = importImageIconSrc;
    importImageBtn.appendChild(importImageIcon);
    importImageBtn.addEventListener("click", () => window.api.loadImage());

    const exportImageBtn = document.createElement("button");
    exportImageBtn.id = "btn_export-image";
    exportImageBtn.className = "btn-common";
    const exportImageIcon = document.createElement("img");
    exportImageIcon.alt = "Exportar Imagem";
    exportImageIcon.src = exportImageIconSrc;
    exportImageBtn.appendChild(exportImageIcon);
    exportImageBtn.addEventListener("click", () =>
      window.api.exportCanvas(WorkArea.getInstance().exportCanvas()),
    );

    const saveProjectBtn = document.createElement("button");
    saveProjectBtn.id = "btn_save-project";
    saveProjectBtn.className = "btn-common";
    const saveProjectIcon = document.createElement("img");
    saveProjectIcon.alt = "Exportar Imagem";
    saveProjectIcon.src = saveProjectIconSrc;
    saveProjectBtn.appendChild(saveProjectIcon);
    saveProjectBtn.addEventListener("click", () => {
      const projectData = WorkArea.getInstance().saveProject();
      window.api.saveProject(projectData);
    });

    const loadProjectBtn = document.createElement("button");
    loadProjectBtn.id = "btn_load-project";
    loadProjectBtn.className = "btn-common";
    const loadProjectIcon = document.createElement("img");
    loadProjectIcon.alt = "Exportar Imagem";
    loadProjectIcon.src = loadProjectIconSrc;
    loadProjectBtn.appendChild(loadProjectIcon);
    loadProjectBtn.addEventListener("click", () => {
      window.api.loadProject();
    });

    const openVideoBtn = document.createElement("button");
    openVideoBtn.id = "btn_open-video";
    const extractVideoIcon = document.createElement("img");
    extractVideoIcon.alt = "Exportar Imagem";
    extractVideoIcon.src = extractVideoIconSrc;
    openVideoBtn.appendChild(extractVideoIcon);
    openVideoBtn.className = "btn-common";
    openVideoBtn.onclick = (): void => {
      window.api.loadVideo();
    };

    const projectOptionsDiv = document.createElement("div");
    projectOptionsDiv.className = "container jc-sb g-1 pad-b-05";
    projectOptionsDiv.append(importImageBtn, exportImageBtn, saveProjectBtn, loadProjectBtn, openVideoBtn);
    domElements.push(projectOptionsDiv);

    const addElementBtn = document.createElement("button");
    addElementBtn.id = "btn_add-element";
    addElementBtn.innerText = "Adicionar Elemento";
    addElementBtn.className = "btn-common";
    addElementBtn.addEventListener("click", () =>
      WorkArea.getInstance().addElement(),
    );
    domElements.push(addElementBtn);

    this.transformMenu = TransformMenu.getInstance().getMenu();
    domElements.push(this.transformMenu);

    this.layersMenu = LayersMenu.getInstance().getMenu();
    domElements.push(this.layersMenu);

    this.textMenu = TextMenu.getInstance().getMenu();
    domElements.push(this.textMenu);

    this.gradientMenu = GradientMenu.getInstance().getMenu();
    domElements.push(this.gradientMenu);

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
