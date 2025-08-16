import { ColorCorrectionFilter } from "src/filters/colorCorrectionFilter";
import { DropShadowFilter } from "src/filters/dropShadowFilter";
import type { Filter } from "src/filters/filter";
import { OuterGlowFilter } from "src/filters/outerGlowFilter";

export class FilterManager {
  private static instance: FilterManager | null = null;
  private filters: Map<string, Filter> = new Map();

  private constructor() {
    this.registerFilter(new ColorCorrectionFilter());
    this.registerFilter(new OuterGlowFilter());
    this.registerFilter(new DropShadowFilter());
  }

  private registerFilter(filter: Filter): void {
    this.filters.set(filter.id, filter);
  }

  public static getInstance(): FilterManager {
    if (!FilterManager.instance) {
      FilterManager.instance = new FilterManager();
    }
    return FilterManager.instance;
  }

  public getFilterById(id: string): Filter | undefined {
    return this.filters.get(id);
  }

  public getAvailableFilters(): Filter[] {
    return Array.from(this.filters.values());
  }
}
