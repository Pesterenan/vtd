import { WorkArea } from './workArea';

export class SideMenu {
  private static instance: SideMenu | null = null;
  private sideMenu?: HTMLMenuElement;
  private transformBox?: HTMLElement;
  private xPosInput: HTMLInputElement | null = null;
  private yPosInput: HTMLInputElement | null = null;
  private widthSizeInput: HTMLInputElement | null = null;
  private heightSizeInput: HTMLInputElement | null = null;

  constructor() {
    this.createSideMenuDOMElements();
    this.xPosInput = document.getElementById('x-pos-input') as HTMLInputElement;
    this.yPosInput = document.getElementById('y-pos-input') as HTMLInputElement;
    this.widthSizeInput = document.getElementById('width-size-input') as HTMLInputElement;
    this.heightSizeInput = document.getElementById('height-size-input') as HTMLInputElement;
    window.addEventListener('evt_transform-box-recalculated', (evt: CustomEvent) => {
      if (this.xPosInput && this.yPosInput && this.widthSizeInput && this.heightSizeInput) {
        this.xPosInput.value = evt.detail.position.x.toFixed(0).toString();
        this.yPosInput.value = evt.detail.position.y.toFixed(0).toString();
        this.widthSizeInput.value = evt.detail.size.width.toFixed(0).toString();
        this.heightSizeInput.value = evt.detail.size.height.toFixed(0).toString();
      }
    });
  }

  private createHR(): HTMLHRElement {
    const horizontalDivider = document.createElement('hr');
    horizontalDivider.setAttribute('style', 'width: 100%;');
    return horizontalDivider;
  }

  private createSideMenuDOMElements(): void {
    const mainWindow = document.getElementById('main-window');
    this.sideMenu = document.createElement('menu');
    this.sideMenu.id = 'side-menu';
    this.sideMenu.className = 'side-menu';
    const domElements: HTMLElement[] = [];

    const importImageBtn = document.createElement('button');
    importImageBtn.id = 'btn_import-image';
    importImageBtn.innerText = 'Importar Imagem';
    importImageBtn.className = 'btn-common';
    importImageBtn.addEventListener('click', () => window.api.loadImage());
    domElements.push(importImageBtn);

    const addElementBtn = document.createElement('button');
    addElementBtn.id = 'btn_add-element';
    addElementBtn.innerText = 'Adicionar Elemento';
    addElementBtn.className = 'btn-common';
    addElementBtn.addEventListener('click', () => WorkArea.getInstance().addElement());
    domElements.push(addElementBtn);

    const saveProjectBtn = document.createElement('button');
    saveProjectBtn.id = 'btn_save-project';
    saveProjectBtn.innerText = 'Salvar Projeto';
    saveProjectBtn.className = 'btn-common';
    saveProjectBtn.addEventListener('click', () => {
      const projectData = WorkArea.getInstance().saveProject();
      // @ts-ignore api defined in main.ts
      window.api.saveProject(projectData);
    });

    const loadProjectBtn = document.createElement('button');
    loadProjectBtn.id = 'btn_load-project';
    loadProjectBtn.innerText = 'Carregar Projeto';
    loadProjectBtn.className = 'btn-common';
    loadProjectBtn.addEventListener('click', () => {
      // @ts-ignore api defined in main.ts
      window.api.loadProject();
    });

    const projectOptionsDiv = document.createElement('div');
    projectOptionsDiv.setAttribute(
      'style',
      `display: flex; gap: 0.25rem; justify-content: space-between; margin-block: 1rem;`
    );
    projectOptionsDiv.append(saveProjectBtn, loadProjectBtn);
    domElements.push(projectOptionsDiv);

    const openVideoBtn = document.createElement('button');
    openVideoBtn.id = 'btn_open-video';
    openVideoBtn.innerText = 'Open Video';
    openVideoBtn.className = 'btn-common';
    openVideoBtn.onclick = (): void => {
      window.api.openFrameExtractorWindow();
      window.api.loadVideo();
    };
    domElements.push(openVideoBtn);
    domElements.push(this.createHR());

    const zoomSliderLabel = document.createElement('label') as HTMLLabelElement;
    zoomSliderLabel.htmlFor = 'sld_zoom';
    zoomSliderLabel.innerText = 'Zoom';
    const zoomSlider = document.createElement('input') as HTMLInputElement;
    zoomSlider.id = 'sld_zoom';
    zoomSlider.type = 'range';
    zoomSlider.className = 'btn-common';
    zoomSlider.min = '0.1';
    zoomSlider.max = '2';
    zoomSlider.step = '0.05';
    zoomSlider.value = '0.3';
    zoomSlider.addEventListener('input', (event) => {
      const zoomLevel = parseFloat(event.target.value);
      const workArea = WorkArea.getInstance();
      workArea.zoomLevel = zoomLevel;
    });
    domElements.push(zoomSliderLabel);
    domElements.push(zoomSlider);

    domElements.push(this.createHR());
    this.transformBox = document.createElement('section');
    this.transformBox.id = 'sec_transform-box-properties';
    this.transformBox.className = 'element-properties-menu';
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

    for (const el of domElements) {
      this.sideMenu.appendChild(el);
    }

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
