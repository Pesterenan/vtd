import type { Filter } from "src/filters/filter";
import { BrightnessContrastFilter } from "src/filters/brightnessContrastFilter";
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
  if (filterData.id === "brightness-contrast") {
    filter = new BrightnessContrastFilter();
    filter.deserialize(filterData);
  }

  if (!filter) {
    console.warn(`Could not deserialize filter ${filterData.id}`);
  }
  return filter;
}
