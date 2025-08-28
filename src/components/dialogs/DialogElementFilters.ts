import createCheckboxControl from "../helpers/createCheckboxControl";
import type { Element } from "src/components/elements/element";
import { GradientElement } from "src/components/elements/gradientElement";
import type { TElementData } from "src/components/types";
import type { Filter, FilterProperties } from "src/filters/filter";
import { FilterManager } from "src/filters/filterManager";
import type { EventBus } from "src/utils/eventBus";
import { Dialog } from "./dialog";

export class DialogElementFilters extends Dialog {
  private activeElement: Element<TElementData> | null = null;
  private initialFilterProperties: FilterProperties[] = [];
  private propertyCache: Map<string, FilterProperties> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    super({ id: "filters", title: "Filtros de Elemento", isDraggable: true });
    this.eventBus = eventBus;
    this.eventBus.on("dialog:elementFilters:open", ({ layerId }) => {
      this.eventBus.emit("workarea:selectById", {
        elementsId: new Set([layerId]),
      });
      const [selectedElements] = this.eventBus.request("workarea:selected:get");
      if (!selectedElements.length) return;
      this.activeElement = selectedElements[0];
      // Deep copy for cancellation
      this.initialFilterProperties = JSON.parse(
        JSON.stringify(this.activeElement.filters),
      );
      this.open();
    });
  }

  protected appendDialogContent(container: HTMLDivElement): void {
    const filterList = document.createElement("div");
    filterList.id = "filter-list";
    filterList.className = "container column";
    const filterControls = document.createElement("div");
    filterControls.id = "filter-controls";
    container.append(filterList, filterControls);
  }

  protected appendDialogActions(menu: HTMLMenuElement): void {
    const btnAccept = document.createElement("button");
    btnAccept.id = "btn_accept-filters";
    btnAccept.className = "btn-common-wide";
    btnAccept.textContent = "Aplicar";
    btnAccept.type = "button";
    btnAccept.addEventListener("click", () => this.close());

    const btnCancel = document.createElement("button");
    btnCancel.id = "btn_cancel-filters";
    btnCancel.className = "btn-common-wide";
    btnCancel.textContent = "Cancelar";
    btnCancel.type = "button";
    btnCancel.addEventListener("click", () => {
      if (this.activeElement) {
        // Restore original properties
        this.activeElement.filters = this.initialFilterProperties;
      }
      this.close();
    });

    const btnReset = document.createElement("button");
    btnReset.id = "btn_reset-filters";
    btnReset.className = "btn-common-wide";
    btnReset.textContent = "Redefinir";
    btnReset.type = "button";
    btnReset.addEventListener("click", () => {
      if (this.activeElement) {
        this.activeElement.filters = [];
      }
      this.populateFilters();
      this.eventBus.emit("workarea:update");
    });
    menu.appendChild(btnAccept);
    menu.appendChild(btnCancel);
    menu.appendChild(btnReset);
  }

  protected override onOpen(): void {
    this.propertyCache.clear();
    this.populateFilters();
  }

  protected override onClose(): void {
    this.activeElement = null;
    this.initialFilterProperties = [];
    this.propertyCache.clear();
    this.clearFilterList();
    this.clearFilterControls();
    this.eventBus.emit("workarea:update");
  }

  private selectFilter(filter: Filter): void {
    if (!this.activeElement) return;
    const filterControls =
      this.dialogContent?.querySelector("#filter-controls");
    if (!filterControls) return;

    const properties = this.activeElement.filters.find(
      (f) => f.id === filter.id,
    );
    if (!properties) return;

    filterControls.appendChild(
      filter.setupFilterControls(properties, (newProperties) => {
        this.handleFilterChange(filter.id, newProperties);
      }),
    );
  }

  private handleFilterChange(
    filterId: string,
    newProperties: Partial<FilterProperties>,
  ): void {
    if (!this.activeElement) return;
    const filterProperties = this.activeElement.filters.find(
      (f) => f.id === filterId,
    );
    if (filterProperties) {
      Object.assign(filterProperties, newProperties);
      this.eventBus.emit("workarea:update");
    }
  }

  private appendToFilterList(filterItem: HTMLLIElement): void {
    const filterList = this.dialogContent?.querySelector("#filter-list");
    if (!filterList) return;
    filterList.appendChild(filterItem);
  }

  private clearFilterList(): void {
    const filterList = this.dialogContent?.querySelector("#filter-list");
    if (!filterList) return;
    filterList.innerHTML = "";
  }

  private clearFilterControls(): void {
    const filterControls =
      this.dialogContent?.querySelector("#filter-controls");
    if (!filterControls) return;
    filterControls.innerHTML = "";
  }

  private populateFilters(): void {
    if (!this.activeElement) return;
    this.clearFilterList();
    this.clearFilterControls();

    const filterManager = FilterManager.getInstance();
    const availableFilters = filterManager.getAvailableFilters();
    const isActiveElementGradient =
      this.activeElement instanceof GradientElement;

    for (const filter of availableFilters) {
      if (
        isActiveElementGradient &&
        (filter.id === "drop-shadow" || filter.id === "outer-glow")
      ) {
        continue;
      }

      const isChecked =
        this.activeElement.filters.some((f) => f.id === filter.id) ?? false;

      const filterItem = document.createElement("li");
      filterItem.id = `filter-item-${filter.id}`;
      filterItem.className = "li_layer-item pad-05";

      const checkboxControl = createCheckboxControl(
        `filter-${filter.id}`,
        filter.label,
        { value: isChecked, tooltip: filter.label },
        (newValue) => {
          this.toggleFilter(filter, newValue);
          this.eventBus.emit("workarea:update");
        },
      );
      checkboxControl.linkEvents();

      filterItem.append(checkboxControl.element);
      this.appendToFilterList(filterItem);
    }
  }

  private toggleFilter(filter: Filter, isChecked: boolean): void {
    if (!this.activeElement) return;
    this.clearFilterControls();

    if (isChecked) {
      const cachedProps = this.propertyCache.get(filter.id);
      if (cachedProps) {
        this.activeElement.filters.push(cachedProps);
        this.propertyCache.delete(filter.id);
      } else {
        const defaultProps = filter.createDefaultProperties();
        this.activeElement.filters.push(defaultProps);
      }
      this.selectFilter(filter);
    } else {
      const propertiesToCache = this.activeElement.filters.find(
        (f) => f.id === filter.id,
      );
      if (propertiesToCache) {
        this.propertyCache.set(filter.id, propertiesToCache);
        this.activeElement.filters = this.activeElement.filters.filter(
          (f) => f.id !== filter.id,
        );
      }
      this.clearFilterControls();
    }
  }
}
