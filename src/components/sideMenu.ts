import exportImageIconSrc from "src/assets/icons/export-image.svg";
import extractVideoIconSrc from "src/assets/icons/extract-video.svg";
import importImageIconSrc from "src/assets/icons/import-image.svg";
import loadProjectIconSrc from "src/assets/icons/load-project.svg";
import saveProjectIconSrc from "src/assets/icons/save-project.svg";
import { GradientMenu } from "src/components/gradientMenu";
import { LayersMenu } from "src/components/layersMenu";
import { TextMenu } from "src/components/textMenu";
import { SIDE_MENU_WIDTH } from "src/constants";
import type { EventBus } from "src/utils/eventBus";
import getElementById from "src/utils/getElementById";
import createIconButton from "./helpers/createIconButton";
import { TransformMenu } from "./transformMenu";

export class SideMenu {
  private static instance: SideMenu | null = null;
  private sideMenu: HTMLMenuElement;
  private layersMenu: HTMLElement;
  private gradientMenu: HTMLElement;
  private textMenu: HTMLElement;
  private transformMenu: HTMLElement;

  constructor(private eventBus: EventBus) {
    this.sideMenu = document.createElement("menu");
    this.transformMenu = TransformMenu.getInstance(eventBus).getMenu();
    this.layersMenu = LayersMenu.getInstance(eventBus).getMenu();
    this.textMenu = TextMenu.getInstance(eventBus).getMenu();
    this.gradientMenu = GradientMenu.getInstance(eventBus).getMenu();
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
      () => this.eventBus.emit("dialog:exportImage:open"),
    );

    const saveProjectBtn = createIconButton(
      "btn_save-project",
      "Salvar Projeto",
      saveProjectIconSrc,
      () => {
        const [projectData] = this.eventBus.request("workarea:project:save");
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

    const appWindow = getElementById<HTMLDivElement>("app-window");
    if (appWindow) {
      appWindow.appendChild(this.sideMenu);
    }
  }

  public static getInstance(eventBus: EventBus): SideMenu {
    if (SideMenu.instance === null) {
      SideMenu.instance = new SideMenu(eventBus);
    }
    return SideMenu.instance;
  }
}
