import type { Element } from "src/components/elements/element";
import type { TElementData } from "src/components/types";
import { ColorCorrectionFilter } from "src/filters/colorCorrectionFilter";
import { DropShadowFilter } from "src/filters/dropShadowFilter";
import type { Filter } from "src/filters/filter";
import { OuterGlowFilter } from "src/filters/outerGlowFilter";
import type { EventBus } from "src/utils/eventBus";
import { Dialog } from "./dialog";
import { CompositeFilter } from "src/filters/compositeFilter";

export class DialogElementFilters extends Dialog {
  private activeElement: Element<TElementData> | null = null;
  private activeElementId = -1;
  private currentFilters: Filter[] = [];
  private defaultFilters: Filter[] = [];
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    super({ id: "filters", title: "Filtros de Elemento", isDraggable: true });
    this.eventBus = eventBus;
    this.eventBus.on("dialog:elementFilters:open", ({ layerId }) => {
      this.activeElementId = layerId;
      this.open();
    });
  }

  protected appendDialogContent(container: HTMLDivElement): void {
    container.innerHTML = `
<div id="filter-list" class="container column"></div>
<div id="filter-controls"></div>
`;
  }

  protected appendDialogActions(menu: HTMLMenuElement): void {
    const btnAccept = document.createElement("button");
    btnAccept.id = "btn_accept-filters";
    btnAccept.className = "btn-common-wide";
    btnAccept.textContent = "Aplicar";
    btnAccept.type = "button";
    btnAccept.addEventListener("click", () => {
      this.activeElementId = -1;
      this.clearFilterControls();
      this.close();
    });

    const btnCancel = document.createElement("button");
    btnCancel.id = "btn_cancel-filters";
    btnCancel.className = "btn-common-wide";
    btnCancel.textContent = "Cancelar";
    btnCancel.type = "button";
    btnCancel.addEventListener("click", () => {
      if (!this.activeElement) return;
      this.activeElement.filters = this.currentFilters;
      this.activeElement = null;
      this.activeElementId = -1;
      this.clearFilterControls();
      this.close();
    });

    const btnReset = document.createElement("button");
    btnReset.id = "btn_reset-filters";
    btnReset.className = "btn-common-wide";
    btnReset.textContent = "Redefinir";
    btnReset.type = "button";
    btnReset.addEventListener("click", () => {
      if (!this.activeElement) return;
      this.activeElement.filters = [];
      this.populateFilters();
      this.eventBus.emit("workarea:update");
    });
    menu.appendChild(btnAccept);
    menu.appendChild(btnCancel);
    menu.appendChild(btnReset);
  }

  protected override onOpen(): void {
    this.defaultFilters = [
      new CompositeFilter(),
      new ColorCorrectionFilter(),
      new DropShadowFilter(),
      new OuterGlowFilter(),
    ];
    this.eventBus.emit("workarea:selectById", {
      elementsId: new Set([this.activeElementId]),
    });
    const [selectedElements] = this.eventBus.request("workarea:selected:get");
    if (!selectedElements) return;
    this.activeElement = selectedElements[0];
    this.currentFilters = [...this.activeElement.filters];
    this.populateFilters();
  }

  protected override onClose(): void {
    this.activeElement = null;
    this.activeElementId = -1;
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
    for (const filter of this.activeElement.filters) {
      mergedFilters.set(filter.id, filter);
    }

    mergedFilters.forEach((filter, key) => {
      const isChecked =
        this.activeElement?.filters.some((f) => f.id === key) ?? false;
      const filterItem = document.createElement("li");
      filterItem.id = `filter-item-${key}`;
      filterItem.className = "container ai-c jc-sb g-05 li_layer-item pad-05";
      filterItem.innerHTML = `
<input type="checkbox" id="chk_filter-${key}" ${isChecked ? "checked" : ""} />
<label>${filter.label}</label>
`;
      filterItem.addEventListener("click", () => {
        this.clearFilterControls();
        this.selectFilter(filter);
        this.eventBus.emit("workarea:update");
      });
      const checkbox = filterItem.querySelector<HTMLInputElement>(
        `#chk_filter-${key}`,
      );
      if (checkbox) {
        checkbox.addEventListener("change", () => {
          this.toggleFilter(filter, checkbox.checked);
          this.eventBus.emit("workarea:update");
        });
      }
      this.appendToFilterList(filterItem);
    });
  }

  private toggleFilter(filter: Filter, isChecked: boolean): void {
    if (!this.activeElement || !this.defaultFilters) return;
    this.clearFilterControls();
    if (isChecked) {
      const exists = this.activeElement.filters.some((f) => f.id === filter.id);
      if (!exists) {
        const defaultFilter = this.defaultFilters.find(
          (f) => f.id === filter.id,
        );
        if (defaultFilter) {
          const currentFilters = this.activeElement.filters;
          this.activeElement.filters = [...currentFilters, defaultFilter];
          this.selectFilter(defaultFilter);
        }
      } else {
        this.selectFilter(filter);
      }
    } else {
      this.activeElement.filters = this.activeElement.filters.filter(
        (f) => f.id !== filter.id,
      );
      this.clearFilterControls();
    }
  }
}
