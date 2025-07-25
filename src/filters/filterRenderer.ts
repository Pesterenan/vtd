import type { Filter } from "./filter";

export class FilterRenderer {
  private static instance: FilterRenderer | null = null;
  private static effectsCanvas: HTMLCanvasElement;
  public static effectsContext: CanvasRenderingContext2D | null = null;

  constructor({ width, height }: HTMLCanvasElement) {
    FilterRenderer.effectsCanvas = document.createElement("canvas");
    FilterRenderer.effectsCanvas.width = width;
    FilterRenderer.effectsCanvas.height = height;
    FilterRenderer.effectsContext =
      FilterRenderer.effectsCanvas.getContext("2d");
  }

  public static getInstance(mainCanvas: HTMLCanvasElement): FilterRenderer {
    if (FilterRenderer.instance === null) {
      FilterRenderer.instance = new FilterRenderer(mainCanvas);
    }
    return FilterRenderer.instance;
  }

  /**
   * Applies the filters according to an order
   */
  public static applyFilters = (
    mainContext: CanvasRenderingContext2D,
    elementFilters: Array<Filter>,
    elementToDraw: (ctx: CanvasRenderingContext2D) => void,
  ): void => {
    if (!FilterRenderer.effectsContext) return;
    for (const filter of elementFilters) {
      FilterRenderer.clearEffects();
      FilterRenderer.effectsContext.save();
      if (filter.applies === 'after') {
        FilterRenderer.effectsContext.drawImage(mainContext.canvas, 0, 0);
      }
      filter.apply(FilterRenderer.effectsContext, elementToDraw);
      mainContext.drawImage(FilterRenderer.effectsCanvas, 0, 0);
      FilterRenderer.effectsContext.restore();
    }
    // if (elementFilters.every((f) => f.applies === "before")) {
    //   elementToDraw(mainContext);
    // }
  };

  /**
   * Clears the canvas that accumulates the final effects.
   * This should be called once before starting the filter chain.
   */
  private static clearEffects(): void {
    if (!FilterRenderer.effectsContext) return;
    FilterRenderer.effectsContext.clearRect(
      0,
      0,
      FilterRenderer.effectsCanvas.width,
      FilterRenderer.effectsCanvas.height,
    );
  }
}
