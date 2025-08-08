import ClosedEyeIcon from "src/assets/icons/closed-eye.svg";
import FilterIcon from "src/assets/icons/filter.svg";
import GroupArrowIcon from "src/assets/icons/group-arrow.svg";
import GroupIcon from "src/assets/icons/group.svg";
import LockedIcon from "src/assets/icons/lock.svg";
import OpenEyeIcon from "src/assets/icons/open-eye.svg";
import TrashIcon from "src/assets/icons/trash.svg";
import UnlockedIcon from "src/assets/icons/unlock.svg";
import errorElement from "src/components/elements/errorElement";
import type {
  AddElementPayload,
  DeleteElementPayload,
  EventBus,
  SelectElementsByIdPayload,
} from "src/utils/eventBus";
import getElementById from "src/utils/getElementById";
import createIconButton from "./helpers/createIconButton";
import type { Layer } from "./types";

export class LayersMenu {
  private static instance: LayersMenu | null = null;
  private draggedLayerLI: HTMLLIElement | null = null;
  private layersList: HTMLUListElement;
  private layersSection: HTMLElement;
  private selectedLayersId: Set<number> = new Set();
  private contextMenu: HTMLDivElement | null = null;

  private constructor(private eventBus: EventBus) {
    this.layersSection = document.createElement("section");
    this.layersList = document.createElement("ul");
    this.createDOMElements();
    this.attachGlobalEvents();

    this.eventBus.on("workarea:initialized", () => {
      this.layersSection?.removeAttribute("disabled");
    });
    this.eventBus.on("workarea:clear", () => {
      this.layersSection?.setAttribute("disabled", "true");
    });
  }

  public static getInstance(eventBus: EventBus): LayersMenu {
    if (LayersMenu.instance === null) {
      LayersMenu.instance = new LayersMenu(eventBus);
    }
    return LayersMenu.instance;
  }

  public getMenu(): HTMLElement {
    return this.layersSection || errorElement("Menu não instanciado");
  }

  private createDOMElements(): void {
    this.layersSection.id = "sec_layers-menu";
    this.layersSection.className = "sec_menu-style";
    this.layersSection.setAttribute("disabled", "true");
    this.layersSection.innerHTML = `
<h5 style="align-self: flex-start;">Camadas:</h5>
<ul id="ul_layers-list"></ul>
<div id="sec_layers-menu-buttons" class="container g-05 ai-c jc-fe"></div>
`;

    const addGroupBtn = createIconButton(
      "btn_add-group",
      "Adicionar Grupo",
      GroupIcon,
      this.handleAddNewGroup,
    );

    const deleteLayerBtn = createIconButton(
      "btn_delete-layer",
      "Deletar Camada",
      TrashIcon,
      this.handleDeleteLayer,
    );

    const btnContainer = this.layersSection.querySelector(
      "#sec_layers-menu-buttons",
    );
    btnContainer?.appendChild(addGroupBtn);
    btnContainer?.appendChild(deleteLayerBtn);

    const layersList =
      this.layersSection.querySelector<HTMLUListElement>("#ul_layers-list");
    if (layersList) {
      this.layersList = layersList;
    }
  }

  private attachGlobalEvents(): void {
    this.eventBus.on("workarea:clear", this.clearLayersList);
    this.eventBus.on("workarea:addElement", this.handleAddElement);
    this.eventBus.on("workarea:deleteElement", this.handleDeleteElement);
    this.eventBus.on("workarea:selectById", this.handleSelectElement);

    this.layersList.addEventListener("dragover", (e) => {
      e.preventDefault();
    });
    this.layersList.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.draggedLayerLI) {
        this.layersList.appendChild(this.draggedLayerLI);
        this.draggedLayerLI = null;
        this.emitGenerateLayerHierarchy();
      }
    });
  }

  private clearLayersList = (): void => {
      this.layersList.innerHTML = "";
  };

  private createLayerItem(layer: Layer, isGroup: boolean): HTMLLIElement {
    const li = document.createElement("li") as HTMLLIElement;
    li.id = `layer-${layer.id}`;
    li.dataset.id = String(layer.id);
    li.draggable = true;

    li.className = isGroup
      ? "container column jc-c li_layer-item"
      : "container ai-jc-c li_layer-item";
    li.innerHTML = isGroup
      ? this.groupTemplate(layer)
      : this.layerTemplate(layer);

    const layerNameSpan = li.querySelector<HTMLSpanElement>(
      `#spn_layer-${layer.id}`,
    );
    if (layerNameSpan) {
      layerNameSpan.innerText = layer.name
        ? layer.name
        : isGroup
          ? `Grupo ${layer.id}`
          : `Camada ${layer.id}`;
    }

    this.attachCommonEvents(li, layer);

    if (isGroup) {
      const childrenList = document.createElement("ul");
      childrenList.id = `ul_group-children-${layer.id}`;
      childrenList.className = "ul_group-children";
      childrenList.style.display = "none";
      li.appendChild(childrenList);
      if (layer.children && layer.children.length > 0) {
        for (const child of layer.children) {
          const isChildGroup = "children" in child;
          const childLI = this.createLayerItem(child, isChildGroup);
          childrenList.appendChild(childLI);
        }
      }
      this.attachGroupEvents(li, childrenList);
    } else {
      const filtersBtn = li.querySelector(
        `#btn_filters-${layer.id}`,
      ) as HTMLButtonElement;
      filtersBtn.addEventListener("dblclick", () => {
        this.eventBus.emit("dialog:elementFilters:open", { layerId: layer.id });
      });
    }

    return li;
  }

  private attachCommonEvents(li: HTMLLIElement, layer: Layer): HTMLLIElement {
    li.addEventListener("contextmenu", (event) => {
      this.showContextMenu(event, layer);
    });

    // Select Layer Event
    li.addEventListener("click", (evt: MouseEvent): void => {
      if (
        evt.target instanceof HTMLButtonElement ||
        evt.target instanceof HTMLInputElement ||
        evt.target instanceof HTMLLabelElement
      )
        return;
      evt.stopPropagation();

      const groupChildrenUL = li.querySelector<HTMLUListElement>(
        `#ul_group-children-${layer.id}`,
      );

      const isGroup = groupChildrenUL !== null;
      if (evt.ctrlKey) {
        if (isGroup) {
          const currentChildren = this.generateLayerHierarchy(groupChildrenUL);
          for (const child of currentChildren) {
            if (this.selectedLayersId.has(child.id)) {
              this.selectedLayersId.delete(child.id);
            } else {
              this.selectedLayersId.add(child.id);
            }
          }
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
            for (const child of currentChildren) {
              if (this.selectedLayersId.has(child.id)) {
                this.selectedLayersId.delete(child.id);
              } else {
                this.selectedLayersId.add(child.id);
              }
            }
          }
        } else {
          this.selectedLayersId.add(layer.id);
        }
      }

      this.eventBus.emit("workarea:selectById", {
        elementsId: this.selectedLayersId,
      });
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
        this.eventBus.emit("workarea:updateElement", {
          elementId: layer.id,
          layerName: layerNameSpan.innerText,
        });
      }
    });

    // Visibility, Lock and Delete Events
    const visibilityInput = li.querySelector(
      `#inp_visibility-${layer.id}`,
    ) as HTMLInputElement;
    visibilityInput.addEventListener("click", (evt) => {
      evt.stopPropagation();
      this.eventBus.emit("workarea:updateElement", {
        elementId: layer.id,
        isVisible: visibilityInput.checked,
      });
    });
    const lockInput = li.querySelector(
      `#inp_lock-${layer.id}`,
    ) as HTMLInputElement;
    lockInput.addEventListener("click", (evt) => {
      evt.stopPropagation();
      this.eventBus.emit("workarea:updateElement", {
        elementId: layer.id,
        isLocked: lockInput.checked,
      });
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
        this.emitGenerateLayerHierarchy();
      }
    });

    return li;
  }

  private attachGroupEvents(
    groupLI: HTMLLIElement,
    childrenList: HTMLUListElement,
  ): void {
    const toggleBtn = groupLI.querySelector(
      `#inp_toggle-children-${groupLI.dataset.id}`,
    ) as HTMLInputElement;
    toggleBtn.addEventListener("click", (evt: Event) => {
      evt.stopPropagation();
      const isHidden = childrenList.style.display === "none";
      childrenList.style.display = isHidden ? "flex" : "none";
      toggleBtn.classList.toggle("active", isHidden);
    });

    groupLI.addEventListener("click", () => {
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
          this.emitGenerateLayerHierarchy();
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
        this.emitGenerateLayerHierarchy();
      }
    });
  }

  private generateLayerHierarchy(layer?: HTMLUListElement): Layer[] {
    const hierarchy: Layer[] = [];
    const layerItems = layer?.querySelectorAll<HTMLLIElement>(":scope > li");
    if (layerItems) {
      for (const li of layerItems) {
        const id = Number(li.dataset.id);
        const isLocked =
          li.querySelector<HTMLInputElement>(`#inp_lock-${id}`)?.checked ||
          false;
        const isVisible =
          li.querySelector<HTMLInputElement>(`#inp_visibility-${id}`)
            ?.checked || false;
        const childrenUL = li.querySelector<HTMLUListElement>(
          `#ul_group-children-${id}`,
        );
        let children: Layer[] | undefined;
        if (childrenUL) {
          children = this.generateLayerHierarchy(childrenUL);
        }
        const name = li.querySelector<HTMLSpanElement>(
          `#spn_layer-${id}`,
        )?.innerText;
        hierarchy.push({ children, id, isLocked, isVisible, name });
      }
    }
    return hierarchy;
  }

  private emitGenerateLayerHierarchy(): void {
    this.eventBus.emit("layer:generateHierarchy", {
      hierarchy: this.generateLayerHierarchy(this.layersList),
    });
  }

  /** Gets the current selected layers and sends an event to delete them */
  private handleDeleteLayer = (): void => {
    const selectedLayers =
      this.layersList.querySelectorAll<HTMLLIElement>("li.selected");
    const selectedLayersId = Array.from(selectedLayers).map((li) =>
      Number(li.dataset.id),
    );
    for (const layerId of selectedLayersId) {
      this.eventBus.emit("workarea:deleteElement", { elementId: layerId });
    }
  };

  private handleSelectElement = ({
    elementsId,
  }: SelectElementsByIdPayload): void => {
    this.selectedLayersId = elementsId;
    for (const li of this.layersList.querySelectorAll("li")) {
      const liId = Number(li.dataset.id);
      if (this.selectedLayersId.has(liId)) {
        li.classList.add("selected");
      } else {
        li.classList.remove("selected");
      }
    }
  };

  private handleDeleteElement = ({ elementId }: DeleteElementPayload): void => {
    const layerToDelete = getElementById<HTMLLIElement>(`layer-${elementId}`);
    if (layerToDelete) {
      layerToDelete.parentElement?.removeChild(layerToDelete);
    }
    this.emitGenerateLayerHierarchy();
  };

  private handleAddElement = ({
    elementId,
    layerName,
    isVisible,
    isLocked,
    type,
    children,
  }: AddElementPayload): void => {
    if (this.layersList.querySelector(`#layer-${elementId}`)) return;

    const isGroup = type === "group";
    const layerLI = this.createLayerItem(
      {
        children: children ?? undefined,
        id: elementId,
        isLocked,
        isVisible,
        name: layerName,
      },
      isGroup,
    );
    this.layersList.appendChild(layerLI);
  };

  private handleAddNewGroup = (): void => {
    this.eventBus.emit("workarea:addGroupElement");
  };

  private groupTemplate(layer: Layer): string {
    return `
<div class="container">
  <div class="li_layer-controls">
    <input id="inp_visibility-${layer.id}" class="tgl-common" type="checkbox" ${layer.isVisible ? "checked" : ""} />
    <label style="--checked-icon-url: url(${OpenEyeIcon}); --icon-url: url(${ClosedEyeIcon});" for="inp_visibility-${layer.id}"></label>
    <input id="inp_lock-${layer.id}" class="tgl-common" type="checkbox" ${layer.isLocked ? "checked" : ""} />
    <label style="--checked-icon-url: url(${LockedIcon}); --icon-url: url(${UnlockedIcon});" for="inp_lock-${layer.id}"></label>
    <input id="inp_toggle-children-${layer.id}" class="tgl-common" type="checkbox" />
    <label style="--checked-icon-url: url(${GroupArrowIcon}); --icon-url: url(${GroupArrowIcon});" for="inp_toggle-children-${layer.id}"></label>
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
      <button id="btn_filters-${layer.id}" class='btn-small'>
        <tooltip title='Editar opções de filtros' />
        <label style="--icon-url: url(${FilterIcon});" />
      </button>
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

  private showContextMenu(event: MouseEvent, layer: Layer): void {
    event.preventDefault();
    this.contextMenu?.remove();
    const li = event.currentTarget as HTMLLIElement;
    const rect = li.getBoundingClientRect();
    this.contextMenu = document.createElement("div");
    this.contextMenu.id = `layer-${layer.id}-context-menu`;
    this.contextMenu.className = "context-menu";
    this.contextMenu.style.top = `${rect.bottom}px`;
    this.contextMenu.style.left = `${rect.left}px`;

    const openFiltersDialogBtn = document.createElement("button");
    openFiltersDialogBtn.textContent = "Editar Filtros do Elemento";
    openFiltersDialogBtn.addEventListener("click", () => {
      this.eventBus.emit("dialog:elementFilters:open", { layerId: layer.id });
      this.contextMenu?.remove();
    });

    const copyTransparentBtn = document.createElement("button");
    copyTransparentBtn.textContent = "Exportar Camada (fundo transparente)";
    copyTransparentBtn.addEventListener("click", () => {
      this.exportLayer(layer, true);
      this.contextMenu?.remove();
    });

    const copyWithBackgroundBtn = document.createElement("button");
    copyWithBackgroundBtn.textContent = "Exportar Camada (com canvas)";
    copyWithBackgroundBtn.addEventListener("click", () => {
      this.exportLayer(layer, false);
      this.contextMenu?.remove();
    });

    const listSeparator = () => {
      const separator = document.createElement("div");
      separator.className = "separator";
      return separator;
    };

    const deleteElementBtn = document.createElement("button");
    deleteElementBtn.textContent = "Apagar Elemento";
    deleteElementBtn.addEventListener("click", () => {
      this.eventBus.emit("workarea:deleteElement", { elementId: layer.id });
      this.contextMenu?.remove();
    });

    this.contextMenu.appendChild(openFiltersDialogBtn);
    this.contextMenu.appendChild(listSeparator());
    this.contextMenu.appendChild(copyTransparentBtn);
    this.contextMenu.appendChild(copyWithBackgroundBtn);
    this.contextMenu.appendChild(listSeparator());
    this.contextMenu.appendChild(deleteElementBtn);

    document.body.appendChild(this.contextMenu);

    const clickOutsideHandler = (e: MouseEvent) => {
      if (this.contextMenu && !this.contextMenu.contains(e.target as Node)) {
        this.contextMenu.remove();
        document.removeEventListener("click", clickOutsideHandler);
      }
    };
    document.addEventListener("click", clickOutsideHandler);
  }

  private exportLayer(layer: Layer, transparent: boolean): void {
    this.eventBus.emit("layer:export", { layerId: layer.id, transparent });
  }
}
