import type { Filter } from "./filter";

export class FilterRenderer {
  private static instance: FilterRenderer | null = null;
  private static copyCanvas: HTMLCanvasElement;
  private static copyContext: CanvasRenderingContext2D | null = null;
  private static effectsCanvas: HTMLCanvasElement;
  private static effectsContext: CanvasRenderingContext2D | null = null;
  private static scratchCanvas: HTMLCanvasElement;
  private static scratchContext: CanvasRenderingContext2D | null = null;

  constructor({ width, height }: HTMLCanvasElement) {
    FilterRenderer.copyCanvas = this.createCanvas(width, height);
    FilterRenderer.copyContext =
      FilterRenderer.copyCanvas.getContext("2d");
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
    const { copyContext, effectsContext, scratchContext } = FilterRenderer;
    if (!copyContext || !effectsContext || !scratchContext) return;

    mainContext.save();

    // Se não houver filtros para aplicar, apenas desenha no mainContext e retorna.
    const sortedFilters = elementFilters.sort((a, b) => a.priority - b.priority);
    if (!sortedFilters.length) {
      elementToDraw(mainContext);
      mainContext.restore();
      return;
    }

    const beforeFilters = sortedFilters.filter((f) => f.applies === "before");
    const afterFilters = sortedFilters.filter((f) => f.applies === "after");

    this.clearContext(scratchContext);
    this.clearContext(effectsContext);
    this.clearContext(copyContext);

    copyContext.drawImage(mainContext.canvas, 0, 0);
    effectsContext.drawImage(copyContext.canvas, 0,0);

    for (const filter of beforeFilters) {
      // O filtro desenha seu efeito isolado no scratchContext.
      this.clearContext(scratchContext);
      scratchContext.save();
      filter.apply(scratchContext, elementToDraw);
      scratchContext.restore();
      // Depois é aplicado no effectsContext.
      effectsContext.save();
      effectsContext.globalAlpha = filter.globalAlpha;
      effectsContext.globalCompositeOperation = filter.composite as GlobalCompositeOperation;
      effectsContext.drawImage(scratchContext.canvas, 0, 0);
      effectsContext.restore();
    }

    if (afterFilters.length > 0) {
      for (const filter of afterFilters) {
        this.clearContext(scratchContext);
        scratchContext.save();
        filter.apply(scratchContext, elementToDraw);
        scratchContext.restore();

        effectsContext.save();
        effectsContext.globalCompositeOperation = 'destination-out';
        effectsContext.drawImage(scratchContext.canvas, 0, 0);
        effectsContext.globalCompositeOperation = 'destination-over';
        effectsContext.drawImage(copyContext.canvas, 0, 0);

        effectsContext.globalAlpha = filter.globalAlpha;
        effectsContext.globalCompositeOperation = filter.composite as GlobalCompositeOperation;
        effectsContext.drawImage(scratchContext.canvas, 0, 0);
        effectsContext.restore();
      }
    } else {
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

