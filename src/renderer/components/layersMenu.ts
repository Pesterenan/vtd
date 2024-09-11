import EVENT from '../utils/customEvents';
import ErrorElement from './errorElement';

export class LayersMenu {
  private static instance: LayersMenu | null = null;
  private layersSection: HTMLElement | null = null;
  private draggedlayerLI: HTMLLIElement | null = null;

  private constructor() {
    this.createDOMElements();
    window.addEventListener(EVENT.ADD_ELEMENT, this.createLayer.bind(this));
    window.addEventListener(EVENT.DELETE_ELEMENT, this.deleteLayer.bind(this));
    window.addEventListener(EVENT.CLEAR_WORKAREA, () => {
      console.log('clearing layer list');
      const layerList = document.getElementById('ul_layers-list');
      if (layerList) {
        layerList.innerHTML = '';
      }
    });
  }

  private createLayer(event: CustomEvent): void {
    const elementId = event.detail.elementId as number;
    console.log('creating layer', elementId);
    const layerList = document.getElementById('ul_layers-list');
    layerList?.append(this.LayerListItem(elementId));
  }

  private deleteLayer(event: CustomEvent): void {
    const elementId = event.detail.elementId;
    console.log('deleting:', elementId);
    const layerList = document.getElementById('ul_layers-list');
    const layerToDelete = document.getElementById(`layer-${elementId}`);
    layerList?.removeChild(layerToDelete as Node);
  }

  private LayerListItem(elementId: number): HTMLLIElement {
    console.log(elementId);
    const layerLI = document.createElement('li');
    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = 'X';
    deleteBtn.onclick = (): void => {
      window.dispatchEvent(new CustomEvent(EVENT.DELETE_ELEMENT, { detail: { elementId } }));
    };

    layerLI.id = `layer-${elementId}`;
    layerLI.dataset.id = String(elementId);
    layerLI.className = 'li_layer-item';
    layerLI.draggable = true;

    layerLI.innerHTML = `<strong>Layer ${elementId}</strong>`;
    layerLI.append(deleteBtn);
    layerLI.addEventListener('dragstart', () => {
      this.draggedlayerLI = layerLI;
    });
    layerLI.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    layerLI.addEventListener('drop', () => {
      if (this.draggedlayerLI) {
        layerLI.before(this.draggedlayerLI);
        this.draggedlayerLI = null;

        const layerList = document.getElementById('ul_layers-list');
        const childNodes = layerList?.querySelectorAll('li');
        const order: number[] = [];
        childNodes?.forEach((child, index) => {
          order.push(parseInt(child.dataset.id || String(index), 10));
        });
        window.dispatchEvent(new CustomEvent(EVENT.REORGANIZE_LAYERS, { detail: { order } }));
      }
    });
    return layerLI;
  }

  public static getInstance(): LayersMenu {
    if (this.instance === null) {
      this.instance = new LayersMenu();
    }
    return this.instance;
  }

  public getMenu(): HTMLElement {
    if (this.layersSection) {
      return this.layersSection;
    }
    return ErrorElement('Menu não instanciado');
  }

  private createDOMElements(): void {
    this.layersSection = document.createElement('section');
    this.layersSection.id = 'sec_layers-menu';
    this.layersSection.innerHTML = `
      <p style="align-self: flex-start;">Camadas:</p>
      <div style="display: flex; flex-wrap: nowrap; width: 100%;">
        <ul id="ul_layers-list" />
      </div>
    `;
  }
}
