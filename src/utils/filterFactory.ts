import { Filter } from "../components/filter";
import { DropShadowFilter } from "../components/dropShadowFilter";

export function createFilter(filterData: Partial<Filter>): Filter | null {
  let filter = null;
  if (filterData.id === "drop-shadow") {
    filter = new DropShadowFilter();
    filter.deserialize(filterData);
  }

  if (!filter) {
    console.warn(`Could not deserialize filter ${filterData.id}`);
  }
  return filter;
}
