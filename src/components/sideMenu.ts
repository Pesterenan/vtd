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
import EVENT, { dispatch } from "src/utils/customEvents";
import createIconButton from "./helpers/createIconButton";

export class SideMenu {
  private static instance: SideMenu | null = null;
  private sideMenu: HTMLMenuElement;
  private layersMenu: HTMLElement;
  private gradientMenu: HTMLElement;
  private textMenu: HTMLElement;
  private transformMenu: HTMLElement;

  constructor() {
    this.sideMenu = document.createElement("menu");
    this.transformMenu = TransformMenu.getInstance().getMenu();
    this.layersMenu = LayersMenu.getInstance().getMenu();
    this.textMenu = TextMenu.getInstance().getMenu();
    this.gradientMenu = GradientMenu.getInstance().getMenu();
    this.createDOMElements();
  }

  private createDOMElements(): void {
    this.sideMenu.id = "side-menu";
    this.sideMenu.className = "side-menu";
    this.sideMenu.setAttribute("style", `width: ${SIDE_MENU_WIDTH}px;`);
    const domElements: HTMLElement[] = [];

    const importImageBtn = createIconButton(
      "btn_import-image",
      "Importar Imagem",
      importImageIconSrc,
      () => window.api.loadImage(),
    );
    const exportImageBtn = createIconButton(
      "btn_export-image",
      "Exportar Imagem",
      exportImageIconSrc,
      () => dispatch(EVENT.OPEN_EXPORT_IMAGE_DIALOG),
    );

    const saveProjectBtn = createIconButton(
      "btn_save-project",
      "Salvar Projeto",
      saveProjectIconSrc,
      () => {
        const projectData = WorkArea.getInstance().saveProject();
        window.api.saveProject(projectData);
      },
    );
    const loadProjectBtn = createIconButton(
      "btn_load-project",
      "Carregar Projeto",
      loadProjectIconSrc,
      () => window.api.loadProject(),
    );
    const openVideoBtn = createIconButton(
      "btn_open-video",
      "Extrair de Vídeo",
      extractVideoIconSrc,
      () => window.api.loadVideo(),
    );

    const projectOptionsDiv = document.createElement("div");
    projectOptionsDiv.className = "sec_menu-style container g-05 jc-sb";
    projectOptionsDiv.append(
      loadProjectBtn,
      saveProjectBtn,
      importImageBtn,
      openVideoBtn,
      exportImageBtn,
    );

    domElements.push(
      projectOptionsDiv,
      this.transformMenu,
      this.layersMenu,
      this.textMenu,
      this.gradientMenu,
    );

    // APPEND ELEMENTS TO SIDE MENU:
    this.sideMenu.append(...domElements);

    const mainWindow = getElementById<HTMLDivElement>("main-window");
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
