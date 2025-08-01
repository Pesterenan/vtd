import type { Filter } from "./filter";

export class FilterRenderer {
  private static instance: FilterRenderer | null = null;
  private static effectsCanvas: HTMLCanvasElement;
  private static effectsContext: CanvasRenderingContext2D | null = null;
  private static scratchCanvas: HTMLCanvasElement;
  private static scratchContext: CanvasRenderingContext2D | null = null;

  constructor({ width, height }: HTMLCanvasElement) {
    FilterRenderer.effectsCanvas = this.createCanvas(width, height);
    FilterRenderer.effectsContext =
      FilterRenderer.effectsCanvas.getContext("2d");
    FilterRenderer.scratchCanvas = this.createCanvas(width, height);
    FilterRenderer.scratchContext =
      FilterRenderer.scratchCanvas.getContext("2d");
  }

  private createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  public static getInstance(mainCanvas: HTMLCanvasElement): FilterRenderer {
    if (FilterRenderer.instance === null) {
      FilterRenderer.instance = new FilterRenderer(mainCanvas);
    }
    return FilterRenderer.instance;
  }

  public static applyFilters = (
    mainContext: CanvasRenderingContext2D,
    elementFilters: Array<Filter>,
    elementToDraw: (ctx: CanvasRenderingContext2D) => void,
  ): void => {
    const { effectsContext, scratchContext } = FilterRenderer;
    if (!effectsContext || !scratchContext) return;
  mainContext.save();

    const sortedFilters = elementFilters.sort(
      (a, b) => a.priority - b.priority,
    );

    this.clearContext(scratchContext);
    this.clearContext(effectsContext);

    for (const filter of sortedFilters) {
      this.clearContext(scratchContext);
      scratchContext.save();
      filter.apply(scratchContext, elementToDraw);
      scratchContext.restore();

      effectsContext.save();
      effectsContext.globalCompositeOperation = 'destination-atop';
      effectsContext.drawImage(mainContext.canvas, 0, 0);
      effectsContext.globalCompositeOperation =
        filter.composite as GlobalCompositeOperation;
      effectsContext.drawImage(this.scratchCanvas, 0, 0);
      effectsContext.restore();
    }

    const colorCorrectionFilter = sortedFilters.find(
      (f) => f.id === "color-correction",
    );
    if (!colorCorrectionFilter) {
      elementToDraw(effectsContext);
    }

    mainContext.drawImage(effectsContext.canvas, 0, 0);
    mainContext.restore();
  };

  private static clearContext(context: CanvasRenderingContext2D): void {
    if (!context) return;
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  }
}
