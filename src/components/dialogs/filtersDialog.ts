import EVENT from "../../utils/customEvents";
import { DropShadowFilter } from "../dropShadowFilter";
import { Element } from "../element";
import { Filter } from "../filter";
import { TElementData } from "../types";
import { WorkArea } from "../workArea";

export class FiltersDialog {
  private filterDialog: HTMLDialogElement | null = null;
  private activeElement: Element<TElementData> | null = null;
  private defaultFilters: Filter[] = [new DropShadowFilter()];
  private elementFilters: Filter[] | null = null;

  constructor() {
    this.createDOMElements();
    this.addEventListeners();
  }

  private createDOMElements(): void {
    this.filterDialog = document.createElement("dialog");
    this.filterDialog.id = "filters-dialog";
    //this.filterDialog.draggable = true;
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
        this.filterDialog.close();
      }
    });
  }

  private openDialog(evt: Event): void {
    const customEvent = evt as CustomEvent<{ elementId: number }>;
    const { elementId } = customEvent.detail;
    const selectedElements = WorkArea.getInstance().getSelectedElements();
    if (selectedElements && selectedElements.length === 1) {
      this.activeElement = selectedElements[0];
      this.elementFilters = this.activeElement.filters;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      this.populateFilters();
    }
    if (this.filterDialog) {
      this.filterDialog.showModal();
    }
  }

  private populateFilters(): void {
    const filtersList = document.getElementById(
      "filters-list",
    ) as HTMLDivElement;
    filtersList.innerHTML = "";

    const mergedFilters = new Map<string, Filter>();
    this.defaultFilters.forEach((filter) =>
      mergedFilters.set(filter.id, filter),
    );

    if (this.elementFilters) {
      this.elementFilters.forEach((filter) =>
        mergedFilters.set(filter.id, filter),
      );
    }

    mergedFilters.forEach((filter, key) => {
      const filterItem = document.createElement("div");
      const isChecked =
        !!this.elementFilters?.find((f) => f.id === key) || false;

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
    if (!this.activeElement) return;
    if (this.elementFilters) {
      if (isChecked) {
        this.elementFilters?.push(filter);
      } else {
        this.elementFilters = this.elementFilters.filter(
          (f) => f.id !== filter.id,
        );
      }
      this.activeElement.filters = this.elementFilters;
    }
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  private addEventListeners(): void {
    window.addEventListener(EVENT.SELECT_ELEMENT, () => {
      const selectedElements = WorkArea.getInstance().getSelectedElements();
      if (selectedElements && selectedElements.length === 1) {
        this.activeElement = selectedElements[0];
        this.elementFilters = this.activeElement.filters;
        window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      }
    });
    window.addEventListener(EVENT.OPEN_FILTERS_DIALOG, (evt: Event) =>
      this.openDialog(evt),
    );
  }
}
