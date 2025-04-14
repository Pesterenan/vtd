import EVENT from "src/utils/customEvents";
import getElementById from "src/utils/getElementById";
import errorElement from "src/components/elements/errorElement";
import OpenEyeIcon from "src/assets/icons/open-eye.svg";
import ClosedEyeIcon from "src/assets/icons/closed-eye.svg";
import LockedIcon from "src/assets/icons/lock.svg";
import UnlockedIcon from "src/assets/icons/unlock.svg";
import { WorkArea } from "./workArea";
import type { Layer } from "./types";

export class LayersMenu {
  private static instance: LayersMenu | null = null;
  private layersSection: HTMLElement | null = null;
  private layersList!: HTMLUListElement;
  private draggedLayerLI: HTMLLIElement | null = null;
  private selectedLayersId: Set<number> = new Set();

  private constructor() {
    this.createDOMElements();
    this.attachGlobalEvents();
  }

  public static getInstance(): LayersMenu {
    if (this.instance === null) {
      this.instance = new LayersMenu();
    }
    return this.instance;
  }

  public getMenu(): HTMLElement {
    return this.layersSection || errorElement("Menu não instanciado");
  }

  private createDOMElements(): void {
    this.layersSection = document.createElement("section");
    this.layersSection.id = "sec_layers-menu";
    this.layersSection.className = "sec_menu-style";
    this.layersSection.innerHTML = `
<h5 style="align-self: flex-start;">Camadas:</h5>
<ul id="ul_layers-list"></ul>
<div id="sec_layers-menu-buttons" class="container g-05 ai-c jc-fe"></div>
`;

    const addGroupBtn = document.createElement("button");
    addGroupBtn.className = "btn-common-wide";
    addGroupBtn.id = "btn_add-group";
    addGroupBtn.innerText = "Adicionar Grupo";
    addGroupBtn.addEventListener("click", this.handleAddNewGroup.bind(this));

    const deleteLayerBtn = document.createElement("button");
    deleteLayerBtn.className = "btn-common-wide";
    deleteLayerBtn.id = "btn_delete-layer";
    deleteLayerBtn.innerText = "Deletar Camada";
    deleteLayerBtn.addEventListener("click", this.handleDeleteLayer.bind(this));

    const btnContainer = this.layersSection.querySelector(
      "#sec_layers-menu-buttons",
    );
    btnContainer?.appendChild(deleteLayerBtn);
    btnContainer?.appendChild(addGroupBtn);

    this.layersList =
      this.layersSection.querySelector<HTMLUListElement>("#ul_layers-list")!;
  }

  private attachGlobalEvents(): void {
    window.addEventListener(EVENT.ADD_ELEMENT, this.handleAddElement.bind(this));
    window.addEventListener(EVENT.DELETE_ELEMENT, this.handleDeleteElement.bind(this));
    window.addEventListener(EVENT.CLEAR_WORKAREA, () => {
      if (this.layersList) {
        this.layersList.innerHTML = "";
      }
    });

    window.addEventListener(EVENT.SELECT_ELEMENT, (evt: Event) => {
      const { elementsId } = (evt as CustomEvent<{ elementsId: Set<number> }>)
        .detail;
      this.selectedLayersId = elementsId;
      this.layersList?.querySelectorAll("li").forEach((node) => {
        const nodeId = Number(node.dataset.id);
        if (this.selectedLayersId.has(nodeId)) {
          node.classList.add("selected");
        } else {
          node.classList.remove("selected");
        }
      });
    });

    this.layersList.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    this.layersList.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.draggedLayerLI) {
        this.layersList.appendChild(this.draggedLayerLI);
        this.draggedLayerLI = null;
        this.dispatchReorganizeEvent();
      }
    });
  }

  private createLayerItem(layer: Layer, isGroup: boolean): HTMLLIElement {
    const li = document.createElement("li") as HTMLLIElement;
    li.id = `layer-${layer.id}`;
    li.dataset.id = String(layer.id);
    li.draggable = true;

    li.className = isGroup
      ? "container-column jc-c li_layer-item"
      : "container ai-jc-c li_layer-item";
    li.innerHTML = isGroup
      ? this.groupTemplate(layer)
      : this.layerTemplate(layer);

    this.attachCommonEvents(li, layer);

    if (isGroup) {
      const childrenList = document.createElement("ul");
      childrenList.className = "group-children";
      childrenList.style.display = "flex";
      li.appendChild(childrenList);
      if (layer.children && layer.children.length > 0) {
        layer.children.forEach((child) => {
          const childLI = this.createLayerItem(child, false);
          childrenList.appendChild(childLI);
        });
      }
      this.attachGroupEvents(li, childrenList);
    } else {
      const filtersBtn = li.querySelector(
        `#btn_filters-${layer.id}`,
      ) as HTMLButtonElement;
      filtersBtn.addEventListener("dblclick", () => {
        window.dispatchEvent(
          new CustomEvent(EVENT.OPEN_FILTERS_DIALOG, {
            detail: { elementId: layer.id },
          }),
        );
      });
    }

    return li;
  }

  private attachCommonEvents(li: HTMLLIElement, layer: Layer): HTMLLIElement {
    // Select Layer Event
    li.addEventListener("click", (evt: MouseEvent): void => {
      if (
        evt.target instanceof HTMLButtonElement ||
        evt.target instanceof HTMLInputElement ||
        evt.target instanceof HTMLLabelElement
      )
        return;
      evt.stopPropagation();

      const groupChildrenUL =
        li.querySelector<HTMLUListElement>("ul.group-children");

      const isGroup = groupChildrenUL !== null;
      if (evt.ctrlKey) {
        if (isGroup) {
          const currentChildren = this.generateLayerHierarchy(groupChildrenUL);
          currentChildren.forEach((child) => {
            if (this.selectedLayersId.has(child.id)) {
              this.selectedLayersId.delete(child.id);
            } else {
              this.selectedLayersId.add(child.id);
            }
          });
        } else {
          if (this.selectedLayersId.has(layer.id)) {
            this.selectedLayersId.delete(layer.id);
          } else {
            this.selectedLayersId.add(layer.id);
          }
        }
      } else {
        this.selectedLayersId.clear();
        if (isGroup) {
          const currentChildren = this.generateLayerHierarchy(groupChildrenUL);
          if (currentChildren.length > 0) {
            currentChildren.forEach((child) => {
              if (this.selectedLayersId.has(child.id)) {
                this.selectedLayersId.delete(child.id);
              } else {
                this.selectedLayersId.add(child.id);
              }
            });
          }
        } else {
          this.selectedLayersId.add(layer.id);
        }
      }

      window.dispatchEvent(
        new CustomEvent(EVENT.SELECT_ELEMENT, {
          detail: { elementsId: this.selectedLayersId },
        }),
      );
    });

    // Name Change Event
    const layerNameSpan = li.querySelector(
      `#spn_layer-${layer.id}`,
    ) as HTMLSpanElement;
    const layerNameInput = li.querySelector(
      `#inp_layer-${layer.id}`,
    ) as HTMLInputElement;
    layerNameSpan.addEventListener("dblclick", () => {
      layerNameSpan.style.display = "none";
      layerNameInput.style.display = "block";
      layerNameInput.focus();
      layerNameInput.select();
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
        layerNameSpan.style.display = "block";
        layerNameInput.style.display = "none";
        window.dispatchEvent(
          new CustomEvent(EVENT.CHANGE_LAYER_NAME, {
            detail: { elementId: layer.id, name: layerNameSpan.innerText },
          }),
        );
      }
    });

    // Visibility, Lock and Delete Events
    const visibilityInput = li.querySelector(
      `#inp_visibility-${layer.id}`,
    ) as HTMLInputElement;
    visibilityInput.addEventListener("click", (evt) => {
      evt.stopPropagation();
      window.dispatchEvent(
        new CustomEvent(EVENT.TOGGLE_ELEMENT_VISIBILITY, {
          detail: { elementId: layer.id, isVisible: visibilityInput.checked },
        }),
      );
    });
    const lockInput = li.querySelector(
      `#inp_lock-${layer.id}`,
    ) as HTMLInputElement;
    lockInput.addEventListener("click", (evt) => {
      evt.stopPropagation();
      window.dispatchEvent(
        new CustomEvent(EVENT.TOGGLE_ELEMENT_LOCK, {
          detail: { elementId: layer.id, isLocked: lockInput.checked },
        }),
      );
    });

    li.addEventListener("dragstart", () => {
      if (!this.draggedLayerLI) {
        this.draggedLayerLI = li;
      }
    });
    li.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      if (this.draggedLayerLI && li !== this.draggedLayerLI) {
        li.parentElement?.insertBefore(this.draggedLayerLI, li);
        this.draggedLayerLI = null;
        this.dispatchReorganizeEvent();
      }
    });

    return li;
  }

  private attachGroupEvents(
    groupLI: HTMLLIElement,
    childrenList: HTMLUListElement,
  ): void {
    const toggleBtn = groupLI.querySelector(
      ".toggle-children",
    ) as HTMLButtonElement;
    toggleBtn.addEventListener("click", (evt: Event) => {
      evt.stopPropagation();
      const isHidden = childrenList.style.display === "none";
      childrenList.style.display = isHidden ? "flex" : "none";
      toggleBtn.textContent = isHidden ? "▼" : "▶";
    });

    groupLI.addEventListener('click', () => {
      const groupChildren = this.generateLayerHierarchy(childrenList);
      const allChildrenSelected = groupChildren.every((child) =>
        this.selectedLayersId.has(child.id),
      );
      const isEmpty = groupChildren.length === 0;
      if (allChildrenSelected || isEmpty) {
        groupLI.classList.add("selected");
      } else {
        groupLI.classList.remove("selected");
      }
    });

    groupLI.addEventListener(
      "drop",
      (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.draggedLayerLI && this.draggedLayerLI !== groupLI) {
          childrenList.appendChild(this.draggedLayerLI);
          this.draggedLayerLI = null;
          this.dispatchReorganizeEvent();
        }
      },
      true,
    );
    childrenList.addEventListener("dragstart", (e) => {
      e.stopPropagation();
    });
    childrenList.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    childrenList.addEventListener("drop", (e) => {
      e.preventDefault();
      if (this.draggedLayerLI && this.draggedLayerLI !== groupLI) {
        childrenList.appendChild(this.draggedLayerLI);
        this.draggedLayerLI = null;
        this.dispatchReorganizeEvent();
      }
    });
  }

  private generateLayerHierarchy(layer?: HTMLUListElement): Layer[] {
    const hierarchy: Layer[] = [];
    layer?.querySelectorAll<HTMLLIElement>(":scope > li").forEach((li) => {
      const id = Number(li.dataset.id);
      const isLocked =
        li.querySelector<HTMLInputElement>(`#inp_lock-${li.dataset.id}`)
          ?.checked || false;
      const isVisible =
        li.querySelector<HTMLInputElement>(`#inp_visibility-${li.dataset.id}`)
          ?.checked || false;
      const childrenUL =
        li.querySelector<HTMLUListElement>("ul.group-children");
      let children: Layer[] | undefined;
      if (childrenUL) {
        children = this.generateLayerHierarchy(childrenUL);
      }
      hierarchy.push({ children, id, isLocked, isVisible });
    });
    return hierarchy;
  }

  private dispatchReorganizeEvent(): void {
    const hierarchy = this.generateLayerHierarchy(this.layersList);
    window.dispatchEvent(
      new CustomEvent(EVENT.REORGANIZE_LAYERS, { detail: { hierarchy } }),
    );
  }

  /** Gets the current selected layers and sends an event to delete them */
  private handleDeleteLayer(): void {
    const selectedLayers =
      this.layersList.querySelectorAll<HTMLLIElement>("li.selected");
    const selectedLayersId = Array.from(selectedLayers).map((li) => Number(li.dataset.id));
    for (const layerId of selectedLayersId) {
      window.dispatchEvent(
        new CustomEvent(EVENT.DELETE_ELEMENT, {
          detail: { elementId: layerId },
        }),
      );
    }
  }

  private handleDeleteElement(evt: Event) :void {
    const customEvent = evt as CustomEvent<{ elementId: number }>;
    const elementId = customEvent.detail.elementId;
    const layerToDelete = getElementById<HTMLLIElement>(`layer-${elementId}`);
    if (layerToDelete) {
      layerToDelete.parentElement?.removeChild(layerToDelete);
    }
    this.dispatchReorganizeEvent();
  }

  private handleAddElement(evt: Event): void {
    const customEvent = evt as CustomEvent;
    const { elementId, layerName, isVisible, isLocked, type, children } =
      customEvent.detail;
    if (this.layersList.querySelector(`#layer-${elementId}`)) return;

    if (type === "group") {
      const groupLI = this.createLayerItem(
        {
          children,
          id: elementId,
          isLocked,
          isVisible,
          name: layerName,
        },
        true,
      );
      this.layersList.appendChild(groupLI);
    } else {
      const layerLI = this.createLayerItem(
        {
          id: elementId,
          isVisible,
          isLocked,
          name: layerName,
        },
        false,
      );
      this.layersList.appendChild(layerLI);
    }
  }

  private handleAddNewGroup(): void {
    WorkArea.getInstance().addGroupElement();
  }

  private groupTemplate(layer: Layer): string {
    return `
<div class="container">
  <div class="li_layer-controls">
    <input id="inp_visibility-${layer.id}" class="tgl-common" type="checkbox" ${layer.isVisible ? "checked" : ""} />
    <label style="--checked-icon-url: url(${OpenEyeIcon}); --icon-url: url(${ClosedEyeIcon});" for="inp_visibility-${layer.id}"></label>
    <input id="inp_lock-${layer.id}" class="tgl-common" type="checkbox" ${layer.isLocked ? "checked" : ""} />
    <label style="--checked-icon-url: url(${LockedIcon}); --icon-url: url(${UnlockedIcon});" for="inp_lock-${layer.id}"></label>
    <button class="toggle-children" title="Mostrar/Ocultar Camadas Filhas">▶</button>
  </div>
  <div class="li_layer-info">
    <input id="inp_layer-${layer.id}"
    type="text"
    class="li_layer-name-input"
    style="display: none;"
    value="${layer.name ? layer.name : `Layer ${layer.id}`}" />
    <span id="spn_layer-${layer.id}" class="li_layer-name pad-i-05">
    ${layer.name ? layer.name : `Grupo ${layer.id}`}
    </span>
  </div>
</div>`;
  }

  private layerTemplate(layer: Layer): string {
    return `
    <div class="li_layer-controls">
      <input id="inp_visibility-${layer.id}" class="tgl-common" type="checkbox" ${layer.isVisible ? "checked" : ""} />
      <label style="--checked-icon-url: url(${OpenEyeIcon}); --icon-url: url(${ClosedEyeIcon});" for="inp_visibility-${layer.id}"></label>
      <input id="inp_lock-${layer.id}" class="tgl-common" type="checkbox" ${layer.isLocked ? "checked" : ""} />
      <label style="--checked-icon-url: url(${LockedIcon}); --icon-url: url(${UnlockedIcon});" for="inp_lock-${layer.id}"></label>
      <button id="btn_filters-${layer.id}" type="button">F</button>
    </div>
    <div class="li_layer-info">
      <input id="inp_layer-${layer.id}"
        type="text"
        class="li_layer-name-input"
        style="display: none;"
        value="${layer.name ? layer.name : `Layer ${layer.id}`}" />
      <span id="spn_layer-${layer.id}" class="li_layer-name pad-i-05">
        ${layer.name ? layer.name : `Camada ${layer.id}`}
      </span>
    </div>
  `;
  }
}
