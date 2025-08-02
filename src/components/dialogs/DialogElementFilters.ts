import type { Element } from "src/components/elements/element";
import type { TElementData } from "src/components/types";
import { ColorCorrectionFilter } from "src/filters/colorCorrectionFilter";
import { DropShadowFilter } from "src/filters/dropShadowFilter";
import type { Filter } from "src/filters/filter";
import { OuterGlowFilter } from "src/filters/outerGlowFilter";
import type { EventBus } from "src/utils/eventBus";
import { Dialog } from "./dialog";
import { GradientElement } from "../elements/gradientElement";

export class DialogElementFilters extends Dialog {
  private activeElement: Element<TElementData> | null = null;
  private currentFilterData: Partial<Filter>[] = [];
  private currentFilters: Filter[] = [];
  private defaultFilters: Filter[] = [];
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
      this.currentFilters = [...this.activeElement.filters];
      for (const filter of this.currentFilters) {
        this.currentFilterData.push(filter.serialize());
      }
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
      for (const filterData of this.currentFilterData) {
        const currentFilter = this.currentFilters.find(
          (f) => f.id === filterData.id,
        );
        if (currentFilter) {
          currentFilter.deserialize(filterData);
        }
      }
      if (this.activeElement) {
        this.activeElement.filters = [...this.currentFilters];
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
    const isActiveElementGradient =
      this.activeElement instanceof GradientElement;
    this.defaultFilters = [
      new ColorCorrectionFilter(),
      ...(!isActiveElementGradient
        ? [new DropShadowFilter(), new OuterGlowFilter()]
        : []),
    ];
    this.populateFilters();
  }

  protected override onClose(): void {
    this.activeElement = null;
    this.currentFilterData = [];
    this.clearFilterList();
    this.clearFilterControls();
    this.eventBus.emit("workarea:update");
  }

  private selectFilter(filter: Filter): void {
    const filterControls =
      this.dialogContent?.querySelector("#filter-controls");
    if (!filterControls) return;
    filterControls.appendChild(
      filter.setupFilterControls(() => this.eventBus.emit("workarea:update")),
    );
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

    const mergedFilters = new Map<string, Filter>();
    for (const filter of this.defaultFilters) {
      mergedFilters.set(filter.id, filter);
    }
    for (const filter of this.currentFilters) {
      mergedFilters.set(filter.id, filter);
    }
    for (const [key, filter] of mergedFilters.entries()) {
      const isChecked =
        this.activeElement?.filters.some((f) => f.id === key) ?? false;
      const filterItem = document.createElement("li");
      filterItem.id = `filter-item-${key}`;
      filterItem.className = "container ai-c jc-sb g-05 li_layer-item pad-05";
      const filterCheckbox = document.createElement(
        "input",
      ) as HTMLInputElement;
      filterCheckbox.type = "checkbox";
      filterCheckbox.id = `chk_filter-${key}`;
      filterCheckbox.checked = isChecked;
      filterCheckbox.addEventListener("change", () => {
        this.toggleFilter(filter, filterCheckbox.checked);
        this.eventBus.emit("workarea:update");
      });
      const filterLabel = document.createElement("label") as HTMLLabelElement;
      filterLabel.innerText = filter.label;
      filterItem.append(filterCheckbox, filterLabel);

      filterItem.addEventListener("click", () => {
        this.clearFilterControls();
        this.selectFilter(filter);
        this.eventBus.emit("workarea:update");
      });
      this.appendToFilterList(filterItem);
    }
  }

  private toggleFilter(filter: Filter, isChecked: boolean): void {
    if (!this.activeElement) return;
    this.clearFilterControls();
    if (isChecked) {
      const existingFilter = this.currentFilters.find(
        (f) => f.id === filter.id,
      );
      const defaultFilter = this.defaultFilters.find((f) => f.id === filter.id);
      const filterToAdd = existingFilter || defaultFilter;
      if (filterToAdd) {
        this.activeElement.filters.push(filterToAdd);
        this.activeElement.filters.sort((a, b) => a.priority - b.priority);
        this.selectFilter(filterToAdd);
      }
    } else {
      this.activeElement.filters = this.activeElement.filters.filter(
        (f) => f.id !== filter.id,
      );
      this.clearFilterControls();
    }
  }
}
