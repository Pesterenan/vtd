import EVENT from "src/utils/customEvents";
import getElementById from "src/utils/getElementById";
import errorElement from "src/components/elements/errorElement";
import OpenEyeIcon from "src/assets/icons/open-eye.svg";
import ClosedEyeIcon from "src/assets/icons/closed-eye.svg";
import LockedIcon from "src/assets/icons/lock.svg";
import UnlockedIcon from "src/assets/icons/unlock.svg";

interface Layer {
  id: number;
  isLocked: boolean;
  isVisible: boolean;
  name?: string;
}

interface LayerGroup extends Layer {
  children: Array<Layer | LayerGroup>;
}

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
    const { elementId, layerName, isVisible, isLocked, type, children } =
      customEvent.detail;
    const layerList = getElementById<HTMLUListElement>("ul_layers-list");

    if (type === "group") {
      layerList?.append(
        this.GroupListItem({
          id: elementId,
          isVisible,
          isLocked,
          name: layerName,
          children,
        }),
      );
    } else {
      layerList?.append(
        this.LayerListItem({
          id: elementId,
          isVisible,
          isLocked,
          name: layerName,
        }),
      );
    }
  }

  private deleteLayer(evt: Event): void {
    const customEvent = evt as CustomEvent;
    const elementId = customEvent.detail.elementId;
    const layerList = getElementById<HTMLUListElement>("ul_layers-list");
    const layerToDelete = getElementById<HTMLLIElement>(`layer-${elementId}`);
    layerList?.removeChild(layerToDelete);
  }

  private GroupListItem(layer: LayerGroup): HTMLLIElement {
    const groupLI = document.createElement("li") as HTMLLIElement;
    groupLI.id = `layer-${layer.id}`;
    groupLI.dataset.id = String(layer.id);
    groupLI.className = "container-column jc-c li_layer-item";
    groupLI.draggable = true;
    groupLI.innerHTML = `
<div class="container">
  <div class="container ai-c bd-r g-05 pad-i-05" style="min-width: fit-content; width: 20%;">
    <input id="inp_visibility-${layer.id}" class="tgl-common" type="checkbox" ${layer.isVisible ? "checked" : ""}>
    <label style="--checked-icon-url: url(${OpenEyeIcon}); --icon-url: url(${ClosedEyeIcon});" for="inp_visibility-${layer.id}"></label>
    </input>
    <button class="toggle-children" title="Mostrar/Ocultar Camadas Filhas">▶</button>
  </div>
  <div class="container ai-c jc-sb g-05" style="width: 80%;">
    <input id="inp_layer-${layer.id}"
      type="text"
      class="li_layer-name-input"
      style="display: none;"
      value="${layer.name ? layer.name : `Layer ${layer.id}`}" />
    <span id="spn_layer-${layer.id}" class="li_layer-name pad-i-05">
      ${layer.name ? layer.name : `Layer ${layer.id}`}
    </span>
    <div class="container ai-c bd-r g-05 pad-i-05" style="min-width: fit-content;">
      <input id="inp_lock-${layer.id}" class="tgl-common" type="checkbox" ${layer.isLocked ? "checked" : ""}>
      <label style="--checked-icon-url: url(${LockedIcon}); --icon-url: url(${UnlockedIcon});" for="inp_lock-${layer.id}"></label>
      </input>
      <button id="btn_delete-layer-${layer.id}" type="button">X</button>
    </div>
  </div>
</div>
<ul class="group-children" style="display: none; width: calc(100% - 0.75rem);"></ul>
`;
    const visibilityInput = groupLI.querySelector(
      `#inp_visibility-${layer.id}`,
    ) as HTMLInputElement;
    const lockInput = groupLI.querySelector(
      `#inp_lock-${layer.id}`,
    ) as HTMLInputElement;

    const toggleBtn = groupLI.querySelector(
      ".toggle-children",
    ) as HTMLButtonElement;
    const childrenList = groupLI.querySelector(
      ".group-children",
    ) as HTMLUListElement;

    const layerNameSpan = groupLI.querySelector(
      `#spn_layer-${layer.id}`,
    ) as HTMLSpanElement;
    const layerNameInput = groupLI.querySelector(
      `#inp_layer-${layer.id}`,
    ) as HTMLInputElement;
    const deleteBtn = groupLI.querySelector(
      `#btn_delete-layer-${layer.id}`,
    ) as HTMLButtonElement;

    if (layer.children && layer.children.length > 0) {
      layer.children.forEach((child: Layer) => {
        const childLI = this.LayerListItem(child);
        childrenList.appendChild(childLI);
      });
    }

    visibilityInput.onclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.TOGGLE_ELEMENT_VISIBILITY, {
          detail: { elementId: layer.id, isVisible: visibilityInput.checked },
        }),
      );
    };
    lockInput.onclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.TOGGLE_ELEMENT_LOCK, {
          detail: { elementId: layer.id, isLocked: lockInput.checked },
        }),
      );
    };
    toggleBtn.addEventListener("click", () => {
      const isHidden = childrenList.style.display === "none";
      childrenList.style.display = isHidden ? "block" : "none";
      toggleBtn.textContent = isHidden ? "▼" : "▶";
    });

    deleteBtn.onclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.DELETE_ELEMENT, {
          detail: { elementId: layer.id },
        }),
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
            detail: { elementId: layer.id, name: layerNameSpan.innerText },
          }),
        );
      }
    });

    groupLI.addEventListener("click", (evt: MouseEvent): void => {
      if (evt.ctrlKey) {
        if (this.selectedLayersId.has(layer.id)) {
          this.selectedLayersId.delete(layer.id);
        } else {
          this.selectedLayersId.add(layer.id);
        }
      } else {
        this.selectedLayersId.clear();
        this.selectedLayersId.add(layer.id);
      }
      window.dispatchEvent(
        new CustomEvent(EVENT.SELECT_ELEMENT, {
          detail: { elementsId: this.selectedLayersId },
        }),
      );
    });

    groupLI.addEventListener("dragstart", () => {
      this.draggedlayerLI = groupLI;
    });
    groupLI.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    groupLI.addEventListener("drop", () => {
      if (this.draggedlayerLI) {
        groupLI.before(this.draggedlayerLI);
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
    return groupLI;
  }

  private LayerListItem(layer: Layer): HTMLLIElement {
    const layerLI = document.createElement("li") as HTMLLIElement;
    layerLI.id = `layer-${layer.id}`;
    layerLI.dataset.id = String(layer.id);
    layerLI.className = "container ai-jc-c li_layer-item";
    layerLI.draggable = true;
    layerLI.innerHTML = `
<div class="container ai-c bd-r g-05 pad-i-05" style="min-width: fit-content; width: 20%;">
  <input id="inp_visibility-${layer.id}" class="tgl-common" type="checkbox" ${layer.isVisible ? "checked" : ""}>
    <label style="--checked-icon-url: url(${OpenEyeIcon}); --icon-url: url(${ClosedEyeIcon});" for="inp_visibility-${layer.id}"></label>
  </input>
  <button id="btn_filters-${layer.id}" type="button">F</button>
</div>
<div class="container ai-c jc-sb g-05" style="width: 80%;">
  <input id="inp_layer-${layer.id}"
    type="text"
    class="li_layer-name-input"
    style="display: none;"
    value="${layer.name ? layer.name : `Layer ${layer.id}`}" />
  <span id="spn_layer-${layer.id}" class="li_layer-name pad-i-05">
    ${layer.name ? layer.name : `Layer ${layer.id}`}
  </span>
  <div class="container ai-c bd-r g-05 pad-i-05" style="min-width: fit-content;">
    <input id="inp_lock-${layer.id}" class="tgl-common" type="checkbox" ${layer.isLocked ? "checked" : ""}>
      <label style="--checked-icon-url: url(${LockedIcon}); --icon-url: url(${UnlockedIcon});" for="inp_lock-${layer.id}"></label>
    </input>
    <button id="btn_delete-layer-${layer.id}" type="button">X</button>
  </div>
</div>
`;
    const visibilityInput = layerLI.querySelector(
      `#inp_visibility-${layer.id}`,
    ) as HTMLInputElement;
    const lockInput = layerLI.querySelector(
      `#inp_lock-${layer.id}`,
    ) as HTMLInputElement;
    const filtersBtn = layerLI.querySelector(
      `#btn_filters-${layer.id}`,
    ) as HTMLButtonElement;
    const layerNameSpan = layerLI.querySelector(
      `#spn_layer-${layer.id}`,
    ) as HTMLSpanElement;
    const layerNameInput = layerLI.querySelector(
      `#inp_layer-${layer.id}`,
    ) as HTMLInputElement;
    const deleteBtn = layerLI.querySelector(
      `#btn_delete-layer-${layer.id}`,
    ) as HTMLButtonElement;

    visibilityInput.onclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.TOGGLE_ELEMENT_VISIBILITY, {
          detail: { elementId: layer.id, isVisible: visibilityInput.checked },
        }),
      );
    };
    lockInput.onclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.TOGGLE_ELEMENT_LOCK, {
          detail: { elementId: layer.id, isLocked: lockInput.checked },
        }),
      );
    };
    filtersBtn.ondblclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.OPEN_FILTERS_DIALOG, {
          detail: { elementId: layer.id },
        }),
      );
    };

    deleteBtn.onclick = (): void => {
      window.dispatchEvent(
        new CustomEvent(EVENT.DELETE_ELEMENT, {
          detail: { elementId: layer.id },
        }),
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
            detail: { elementId: layer.id, name: layerNameSpan.innerText },
          }),
        );
      }
    });

    layerLI.addEventListener("click", (evt: MouseEvent): void => {
      if (evt.ctrlKey) {
        if (this.selectedLayersId.has(layer.id)) {
          this.selectedLayersId.delete(layer.id);
        } else {
          this.selectedLayersId.add(layer.id);
        }
      } else {
        this.selectedLayersId.clear();
        this.selectedLayersId.add(layer.id);
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
    this.layersSection.innerHTML = `<h5 style="align-self: flex-start;">Camadas:</h5>`;
    const ulLayersList = document.createElement("ul");
    ulLayersList.id = "ul_layers-list";
    this.layersSection.appendChild(ulLayersList);
  }
}
