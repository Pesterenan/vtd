import EVENT from '../utils/customEvents';
import getElementById from '../utils/getElementById';
import ErrorElement from './errorElement';

export class LayersMenu {
  private static instance: LayersMenu | null = null;
  private layersSection: HTMLElement | null = null;
  private draggedlayerLI: HTMLLIElement | null = null;
  private selectedLayersId: Set<number> = new Set();

  private constructor() {
    this.createDOMElements();
    window.addEventListener(EVENT.ADD_ELEMENT, this.createLayer.bind(this));
    window.addEventListener(EVENT.DELETE_ELEMENT, this.deleteLayer.bind(this));
    window.addEventListener(EVENT.CLEAR_WORKAREA, () => {
      console.log('clearing layer list');
      const layerList = getElementById<HTMLUListElement>('ul_layers-list');
      if (layerList) {
        layerList.innerHTML = '';
      }
    });
    window.addEventListener(EVENT.SELECT_ELEMENT, (evt: Event) => {
      const customEvent = evt as CustomEvent<{ elementsId: Set<number> }>;
      const { elementsId } = customEvent.detail;
      this.selectedLayersId = elementsId;
      const layerList = getElementById<HTMLUListElement>('ul_layers-list');
      const childNodes = layerList?.querySelectorAll('li');
      childNodes?.forEach((node) => {
        if (this.selectedLayersId.has(Number(node.dataset.id))) {
          node.classList.add('selected');
        } else {
          node.classList.remove('selected');
        }
      });
    });
  }

  private createLayer(evt: Event): void {
    const customEvent = evt as CustomEvent;
    const { elementId, layerName } = customEvent.detail;
    console.log('creating layer', elementId);
    const layerList = getElementById<HTMLUListElement>('ul_layers-list');
    layerList?.append(this.LayerListItem(elementId, layerName));
  }

  private deleteLayer(evt: Event): void {
    const customEvent = evt as CustomEvent;
    const elementId = customEvent.detail.elementId;
    console.log('deleting:', elementId);
    const layerList = getElementById<HTMLUListElement>('ul_layers-list');
    const layerToDelete = getElementById<HTMLLIElement>(`layer-${elementId}`);
    layerList?.removeChild(layerToDelete);
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

    layerLI.addEventListener('click', (evt: MouseEvent): void => {
      if (evt.ctrlKey) {
        if (this.selectedLayersId.has(elementId)) {
          this.selectedLayersId.delete(elementId);
        } else {
          this.selectedLayersId.add(elementId);
        }
      } else {
        this.selectedLayersId.clear();
        this.selectedLayersId.add(elementId);
      }
      window.dispatchEvent(
        new CustomEvent(EVENT.SELECT_ELEMENT, {
          detail: { elementsId: this.selectedLayersId }
        })
      );
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

        const layerList = getElementById<HTMLUListElement>('ul_layers-list');
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