import EVENT from "src/utils/customEvents";
import { DropShadowFilter } from "src/filters/dropShadowFilter";
import type { Element } from "src/components/elements/element";
import type { Filter } from "src/filters/filter";
import type { TElementData } from "src/components/types";
import { WorkArea } from "src/components/workArea";
import { OuterGlowFilter } from "src/filters/outerGlowFilter";

export class FiltersDialog {
  private filterDialog: HTMLDialogElement | null = null;
  private defaultFilters: Filter[] | null = null;
  private activeElement: Element<TElementData> | null = null;

  constructor() {
    this.createDOMElements();
    this.addEventListeners();
  }

  private createDOMElements(): void {
    this.filterDialog = document.createElement("dialog");
    this.filterDialog.id = "filters-dialog";
    this.filterDialog.innerHTML = `
      <form method="dialog">
        <h3>Filtros de Elemento</h3>
        <div class="container g-05 ai-fs">
          <div id="filters-list" class="container-column"></div>
          <div id="filter-controls"></div>
        </div>
        <menu>
          <button id="btn_close-dialog" class="btn-common-wide">Fechar</button>
        </menu>
      </form>
    `;
    document.body.appendChild(this.filterDialog);

    const closeButton = this.filterDialog.querySelector(
      "#btn_close-dialog",
    ) as HTMLButtonElement;
    closeButton.addEventListener("click", () => {
      if (this.filterDialog) {
        this.activeElement = null;
        this.clearFilterControls();
        this.filterDialog.close();
      }
    });
  }

  private openDialog(): void {
    this.defaultFilters = [new DropShadowFilter(), new OuterGlowFilter()];
    const selectedElements = WorkArea.getInstance().getSelectedElements();
    if (selectedElements && selectedElements.length === 1) {
      this.activeElement = selectedElements[0];
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      this.clearFilterControls();
      this.populateFilters();
    }
    if (this.filterDialog) {
      this.filterDialog.showModal();
    }
  }

  private populateFilters(): void {
    if (!this.activeElement) return;

    const filtersList = document.getElementById(
      "filters-list",
    ) as HTMLDivElement;
    filtersList.innerHTML = "";

    const mergedFilters = new Map<string, Filter>();

    if (this.defaultFilters) {
      this.defaultFilters.forEach((filter) =>
        mergedFilters.set(filter.id, filter),
      );
    }

    if (this.activeElement.filters) {
      this.activeElement.filters.forEach((filter) => {
        mergedFilters.set(filter.id, filter);
      });
    }

    mergedFilters.forEach((filter, key) => {
      const isChecked =
        !!this.activeElement?.filters?.find((f) => f.id === key) || false;
      const filterItem = document.createElement("li") as HTMLLIElement;
      filterItem.id = `filter-item-${filter.id}`;
      filterItem.className = "container ai-c jc-sb g-05 li_layer-item pad-05";
      filterItem.innerHTML = `
<input type="checkbox" id="chk_filter-${filter.id}" ${isChecked ? "checked" : ""} />
<label>${filter.label}</label>
`;
      filterItem.onclick = () => {
        this.clearFilterControls();
        this.selectFilter(filter);
      };

      const checkbox = filterItem.querySelector(
        `#chk_filter-${filter.id}`,
      ) as HTMLInputElement;
      checkbox.addEventListener("change", () =>
        this.toggleFilter(filter, checkbox.checked),
      );
      filtersList.appendChild(filterItem);
    });
  }

  private selectFilter(filter: Filter): void {
    const filterControls = this.filterDialog?.querySelector("#filter-controls");
    if (filterControls) {
      filterControls.appendChild(filter.getFilterControls() as HTMLDivElement);
    }
  }

  private toggleFilter(filter: Filter, isChecked: boolean): void {
    if (!this.activeElement || !this.defaultFilters) return;
    this.clearFilterControls();
    if (isChecked) {
      const existingFilter = this.activeElement.filters?.find(
        (f) => f.id === filter.id,
      );

      if (!existingFilter) {
        const defaultFilter = this.defaultFilters.find(
          (f) => f.id === filter.id,
        ) as Filter;
        if (defaultFilter) {
          this.activeElement.filters.push(defaultFilter);
          this.selectFilter(defaultFilter);
        }
      } else {
        this.selectFilter(existingFilter);
      }
    } else {
      this.activeElement.filters = this.activeElement.filters.filter(
        (f) => f.id !== filter.id,
      );
      this.clearFilterControls();
    }
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  private clearFilterControls(): void {
    const filterControls = this.filterDialog?.querySelector("#filter-controls");
    if (filterControls) {
      filterControls.innerHTML = "";
    }
  }

  private addEventListeners(): void {
    window.addEventListener(EVENT.OPEN_FILTERS_DIALOG, () => this.openDialog());
  }
}
