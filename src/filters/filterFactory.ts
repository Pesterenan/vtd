import type { Filter } from "src/filters/filter";
import { ColorCorrectionFilter } from "src/filters/colorCorrectionFilter";
import { DropShadowFilter } from "src/filters/dropShadowFilter";
import { OuterGlowFilter } from "src/filters/outerGlowFilter";


export function createFilter(filterData: Partial<Filter>): Filter | null {
  let filter = null;
  if (filterData.id === "drop-shadow") {
    filter = new DropShadowFilter();
    filter.deserialize(filterData);
  }
  if (filterData.id === "outer-glow") {
    filter = new OuterGlowFilter();
    filter.deserialize(filterData);
  }
  if (filterData.id === "color-correction") {
    filter = new ColorCorrectionFilter();
    filter.deserialize(filterData);
  }
  

  if (!filter) {
    console.warn(`Could not deserialize filter ${filterData.id}`);
  }
  return filter;
}
