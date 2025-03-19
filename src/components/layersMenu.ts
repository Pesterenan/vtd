import EVENT from "src/utils/customEvents";
import getElementById from "src/utils/getElementById";
import errorElement from "src/components/elements/errorElement";
import OpenEyeIcon from "src/assets/icons/open-eye.svg";
import ClosedEyeIcon from "src/assets/icons/closed-eye.svg";
import LockedIcon from "src/assets/icons/lock.svg";
import UnlockedIcon from "src/assets/icons/unlock.svg";

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
      const layerList = getElementById<HTMLUListElement>("ul_layers-list");
      if (layerList) {
        layerList.innerHTML = "";
      }
    });
    window.addEventListener(EVENT.SELECT_ELEMENT, (evt: Event) => {
      const customEvent = evt as CustomEvent<{ elementsId: Set<number> }>;
      const { elementsId } = customEvent.detail;
      this.selectedLayersId = elementsId;
      const layerList = getElementById<HTMLUListElement>("ul_layers-list");
      const childNodes = layerList?.querySelectorAll("li");
      childNodes?.forEach((node) => {
        if (this.selectedLayersId.has(Number(node.dataset.id))) {
          node.classList.add("selected");
        } else {
          node.classList.remove("selected");
        }
      });
    });
  }

  private createLayer(evt: Event): void {
    const customEvent = evt as CustomEvent;
    const { elementId, layerName } = customEvent.detail;
    const layerList = getElementById<HTMLUListElement>("ul_layers-list");
    layerList?.append(this.LayerListItem(elementId, layerName));
  }

  private deleteLayer(evt: Event): void {
    const customEvent = evt as CustomEvent;
    const elementId = customEvent.detail.elementId;
    const layerList = getElementById<HTMLUListElement>("ul_layers-list");
    const layerToDelete = getElementById<HTMLLIElement>(`layer-${elementId}`);
    layerList?.removeChild(layerToDelete);
  }

  private LayerListItem(elementId: number, layerName?: string): HTMLLIElement {
    const layerLI = document.createElement("li") as HTMLLIElement;
    layerLI.id = `layer-${elementId}`;
    layerLI.dataset.id = String(elementId);
    layerLI.className = "container ai-jc-c li_layer-item";
    layerLI.draggable = true;
    layerLI.innerHTML = `
<div class="container ai-c bd-r g-05 pad-i-05" style="flex-basis: auto;">
  <input id="inp_visibility-${elementId}" class="tgl-common" type="checkbox" checked>
    <label style="--checked-icon-url: url(${OpenEyeIcon}); --icon-url: url(${ClosedEyeIcon});" for="inp_visibility-${elementId}"></label>
  </input>
  <button id="btn_filters-${elementId}" type="button">F</button>
</div>
<div class="container ai-c jc-sb fb-100 g-05">
  <input id="inp_layer-${elementId}"
    type="text"
    class="li_layer-name-input"
    style="display: none;"
    value="${layerName ? layerName : `Layer ${elementId}`}" />
  <span id="spn_layer-${elementId}" class="pad-i-05">
    ${layerName ? layerName : `Layer ${elementId}`}
  </span>
  <div class="container ai-c bd-r g-05 pad-i-05" style="flex-basis: auto;">
    <input id="inp_lock-${elementId}" class="tgl-common" type="checkbox">
      <label style="--checked-icon-url: url(${LockedIcon}); --icon-url: url(${UnlockedIcon});" for="inp_lock-${elementId}"></label>
    </input>
    <button id="btn_delete-layer-${elementId}" type="button">X</button>
  </div>
</div>
`;
    const visibilityInput = layerLI.querySelector(
      `#inp_visibility-${elementId}`,
    ) as HTMLInputElement;
    const lockInput = layerLI.querySelector(
      `#inp_lock-${elementId}`,
    ) as HTMLInputElement;
    const filtersBtn = layerLI.querySelector(
      `#btn_filters-${elementId}`,
    ) as HTMLButtonElement;
    const layerNameSpan = layerLI.querySelector(
      `#spn_layer-${elementId}`,
    ) as HTMLSpanElement;
    const layerNameInput = layerLI.querySelector(
      `#inp_layer-${elementId}`,
    ) as HTMLInputElement;
    const deleteBtn = layerLI.querySelector(
      `#btn_delete-layer-${elementId}`,
    ) as HTMLButtonElement;

    visibilityInput.onclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.TOGGLE_ELEMENT_VISIBILITY, {
          detail: { elementId, isVisible: visibilityInput.checked },
        }),
      );
    };
    lockInput.onclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.TOGGLE_ELEMENT_LOCK, {
          detail: { elementId, isLocked: lockInput.checked },
        }),
      );
    };
    filtersBtn.ondblclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.OPEN_FILTERS_DIALOG, { detail: { elementId } }),
      );
    };

    deleteBtn.onclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.DELETE_ELEMENT, { detail: { elementId } }),
      );
    };

    layerNameSpan.addEventListener("dblclick", () => {
      layerNameSpan.setAttribute("style", "display: none;");
      layerNameInput.setAttribute("style", "display: block;");
      layerNameInput.focus();
      layerNameInput.select();
    });

    layerNameSpan.addEventListener("click", (evt) => {
      evt.stopPropagation();
    });

    layerNameInput.addEventListener("click", (evt) => {
      evt.stopPropagation();
    });

    layerNameInput.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" || evt.key === "Escape") {
        if (evt.key === "Enter") {
          layerNameSpan.innerText = layerNameInput.value;
        }
        if (evt.key === "Escape") {
          layerNameInput.value = layerNameSpan.innerText;
        }
        layerNameSpan.setAttribute("style", "display: block;");
        layerNameInput.setAttribute("style", "display: none;");
        window.dispatchEvent(
          new CustomEvent(EVENT.CHANGE_LAYER_NAME, {
            detail: { elementId, name: layerNameSpan.innerText },
          }),
        );
      }
    });

    layerLI.addEventListener("click", (evt: MouseEvent): void => {
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
          detail: { elementsId: this.selectedLayersId },
        }),
      );
    });

    layerLI.addEventListener("dragstart", () => {
      this.draggedlayerLI = layerLI;
    });
    layerLI.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    layerLI.addEventListener("drop", () => {
      if (this.draggedlayerLI) {
        layerLI.before(this.draggedlayerLI);
        this.draggedlayerLI = null;

        const layerList = getElementById<HTMLUListElement>("ul_layers-list");
        const childNodes = layerList?.querySelectorAll("li");
        const order: number[] = [];
        childNodes?.forEach((child, index) => {
          order.push(parseInt(child.dataset.id || String(index), 10));
        });
        window.dispatchEvent(
          new CustomEvent(EVENT.REORGANIZE_LAYERS, { detail: { order } }),
        );
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
    return errorElement("Menu não instanciado");
  }

  private createDOMElements(): void {
    this.layersSection = document.createElement("section");
    this.layersSection.id = "sec_layers-menu";
    this.layersSection.className = "sec_menu-style";
    this.layersSection.innerHTML = `
      <h5 style="align-self: flex-start;">Camadas:</h5>
      <ul id="ul_layers-list" />
    `;
  }
}
