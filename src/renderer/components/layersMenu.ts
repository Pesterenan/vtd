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
    const { elementId, layerName } = event.detail;
    console.log('creating layer', elementId);
    const layerList = document.getElementById('ul_layers-list');
    layerList?.append(this.LayerListItem(elementId, layerName));
  }

  private deleteLayer(event: CustomEvent): void {
    const elementId = event.detail.elementId;
    console.log('deleting:', elementId);
    const layerList = document.getElementById('ul_layers-list');
    const layerToDelete = document.getElementById(`layer-${elementId}`);
    layerList?.removeChild(layerToDelete as Node);
  }

  private LayerListItem(elementId: number, layerName?: string): HTMLLIElement {
    const layerLI = document.createElement('li') as HTMLLIElement;
    const visibilityInput = document.createElement('input') as HTMLInputElement;
    const layerNameSpan = document.createElement('strong') as HTMLSpanElement;
    const layerNameInput = document.createElement('input') as HTMLInputElement;
    const deleteBtn = document.createElement('button') as HTMLButtonElement;

    layerNameSpan.innerText = layerName ? layerName : `Layer ${elementId}`;
    layerNameInput.value = `Layer ${elementId}`;
    layerNameInput.type = 'text';
    layerNameInput.className = 'li_layer-name-input';
    layerNameInput.setAttribute('style', 'display: none;');

    visibilityInput.type = 'checkbox';
    visibilityInput.checked = true;
    visibilityInput.onclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.TOGGLE_ELEMENT_VISIBILITY, {
          detail: { elementId, isVisible: visibilityInput.checked }
        })
      );
    };

    deleteBtn.innerText = 'X';
    deleteBtn.onclick = (): void => {
      window.dispatchEvent(new CustomEvent(EVENT.DELETE_ELEMENT, { detail: { elementId } }));
    };
    deleteBtn.className = 'btn_delete-layer';

    layerLI.id = `layer-${elementId}`;
    layerLI.dataset.id = String(elementId);
    layerLI.className = 'li_layer-item';
    layerLI.draggable = true;
    layerLI.append(visibilityInput, layerNameSpan, layerNameInput, deleteBtn);

    layerNameSpan.addEventListener('dblclick', () => {
      layerNameSpan.setAttribute('style', 'display: none;');
      layerNameInput.setAttribute('style', 'display: block;');
    });

    layerNameSpan.addEventListener('click', (evt) => {
      evt.stopPropagation();
    });

    layerNameInput.addEventListener('click', (evt) => {
      evt.stopPropagation();
    });

    layerNameInput.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === 'Escape') {
        if (evt.key === 'Enter') {
          layerNameSpan.innerText = layerNameInput.value;
        }
        if (evt.key === 'Escape') {
          layerNameInput.value = layerNameSpan.innerText;
        }
        layerNameSpan.setAttribute('style', 'display: block;');
        layerNameInput.setAttribute('style', 'display: none;');
        window.dispatchEvent(
          new CustomEvent(EVENT.CHANGE_LAYER_NAME, {
            detail: { elementId, name: layerNameSpan.innerText }
          })
        );
      }
    });

    layerLI.addEventListener('click', () => {
      layerLI.classList.toggle('selected');
      window.dispatchEvent(new CustomEvent(EVENT.SELECT_ELEMENT, { detail: { elementId } }));
    });

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
