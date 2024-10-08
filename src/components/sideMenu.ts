import EVENT from "src/utils/customEvents";
import getElementById from "src/utils/getElementById";
import { GradientMenu } from "src/components/gradientMenu";
import { LayersMenu } from "src/components/layersMenu";
import { TextMenu } from "src/components/textMenu";
import { WorkArea } from "src/components/workArea";
import { SIDE_MENU_WIDTH } from "src/constants";

export class SideMenu {
  private static instance: SideMenu | null = null;
  private sideMenu?: HTMLMenuElement;
  private transformBox?: HTMLElement;
  private xPosInput: HTMLInputElement;
  private yPosInput: HTMLInputElement;
  private widthSizeInput: HTMLInputElement;
  private heightSizeInput: HTMLInputElement;
  private layersMenu: HTMLElement | null = null;
  private gradientMenu: HTMLElement | null = null;
  private textMenu: HTMLElement | null = null;

  constructor() {
    this.createDOMElements();
    this.xPosInput = getElementById<HTMLInputElement>("x-pos-input");
    this.yPosInput = getElementById<HTMLInputElement>("y-pos-input");
    this.widthSizeInput = getElementById<HTMLInputElement>("width-size-input");
    this.heightSizeInput =
      getElementById<HTMLInputElement>("height-size-input");
    window.addEventListener(EVENT.RECALCULATE_TRANSFORM_BOX, (evt: Event) => {
      const customEvent = evt as CustomEvent;
      const { position, size } = customEvent.detail;
      if (
        this.xPosInput &&
        this.yPosInput &&
        this.widthSizeInput &&
        this.heightSizeInput
      ) {
        this.xPosInput.value = position.x.toFixed(0).toString();
        this.yPosInput.value = position.y.toFixed(0).toString();
        this.widthSizeInput.value = size.width.toFixed(0).toString();
        this.heightSizeInput.value = size.height.toFixed(0).toString();
      }
    });
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
    projectOptionsDiv.setAttribute(
      "style",
      `display: flex; gap: 0.25rem; justify-content: space-between; margin-block: 1rem;`,
    );
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

    this.transformBox = document.createElement("section");
    this.transformBox.id = "sec_transform-box-properties";
    this.transformBox.className = "sec_menu-style element-properties-menu";
    this.transformBox.innerHTML = `
      <p style="align-self: flex-start;">Caixa de Transformação:</p>
      <div style="display: flex; flex-wrap: nowrap; width: 100%;">
        <div class="number-input-group">
          <p style="align-self: flex-start;">Posição:</p>
          <div style="display: flex; justify-content: space-between; padding-inline: 0.5rem;">
            <label for="x-pos-input">X:</label>
            <input id="x-pos-input" class="number-input" type="number" value="0" />
          </div>

          <div style="display: flex; justify-content: space-between; padding-inline: 0.5rem;">
            <label for="y-pos-input">Y:</label>
            <input id="y-pos-input" class="number-input" type="number" value="0" />
          </div>
        </div>
        <div class="number-input-group">
          <p style="align-self: flex-start;">Tamanho:</p>

          <div style="display: flex; justify-content: space-between; padding-inline: 0.5rem;">
            <label for="width-size-input">Largura:</label>
            <input id="width-size-input" class="number-input" type="number" value="0" />
          </div>
          <div style="display: flex; justify-content: space-between; padding-inline: 0.5rem;">
            <label for="height-size-input">Altura:</label>
            <input id="height-size-input" class="number-input" type="number" value="0" />
          </div>
        </div>
      </div>
    `;
    domElements.push(this.transformBox);
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
