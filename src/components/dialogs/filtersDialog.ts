import EVENT from "../../utils/customEvents";
import { DropShadowFilter } from "../dropShadowFilter";
import { Element } from "../element";
import { Filter } from "../filter";
import { TElementData } from "../types";
import { WorkArea } from "../workArea";

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
        <h3>Choose Filters</h3>
        <div id="filters-list"></div>
        <menu>
          <button id="btn_close-dialog" class="btn-common">Close</button>
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
        this.filterDialog.close();
      }
    });
  }

  private openDialog(): void {
    this.defaultFilters = [new DropShadowFilter()];
    const selectedElements = WorkArea.getInstance().getSelectedElements();
    if (selectedElements && selectedElements.length === 1) {
      this.activeElement = selectedElements[0];
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
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
      const filterItem = document.createElement("div");
      const isChecked =
        !!this.activeElement?.filters?.find((f) => f.id === key) || false;

      filterItem.innerHTML = `
<input type="checkbox" id="chk_filter-${filter.id}" ${isChecked ? "checked" : ""} />
<label for="chk_filter-${filter.id}">${filter.label}</label>
`;

      const checkbox = filterItem.querySelector(
        `#chk_filter-${filter.id}`,
      ) as HTMLInputElement;
      checkbox.addEventListener("change", () =>
        this.toggleFilter(filter, checkbox.checked),
      );
      filterItem.appendChild(filter.getHTML());
      filtersList.appendChild(filterItem);
    });
  }

  private toggleFilter(filter: Filter, isChecked: boolean): void {
    if (!this.activeElement || !this.defaultFilters) return;
    if (isChecked) {
      if (!this.activeElement.filters?.find((f) => f.id === filter.id)) {
        this.activeElement.filters.push(
          this.defaultFilters.find((f) => f.id === filter.id) as Filter,
        );
      }
    } else {
      this.activeElement.filters = this.activeElement.filters.filter(
        (f) => f.id !== filter.id,
      );
    }
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  private addEventListeners(): void {
    window.addEventListener(EVENT.OPEN_FILTERS_DIALOG, () => this.openDialog());
  }
}
