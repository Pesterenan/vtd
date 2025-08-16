import type { Size } from "src/components/types";
import type { FilterProperties } from "./filter";
import { FilterManager } from "./filterManager";

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
    FilterRenderer.copyContext = FilterRenderer.copyCanvas.getContext("2d");
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

  public static updateSize(newSize?: Size) {
    if (
      this.copyCanvas &&
      this.effectsCanvas &&
      this.scratchCanvas &&
      newSize
    ) {
      this.copyCanvas.width = newSize.width;
      this.copyCanvas.height = newSize.height;
      this.effectsCanvas.width = newSize.width;
      this.effectsCanvas.height = newSize.height;
      this.scratchCanvas.width = newSize.width;
      this.scratchCanvas.height = newSize.height;
    }
  }

  public static getInstance(mainCanvas: HTMLCanvasElement): FilterRenderer {
    if (FilterRenderer.instance === null) {
      FilterRenderer.instance = new FilterRenderer(mainCanvas);
    }
    return FilterRenderer.instance;
  }

  public static applyFilters = (
    mainContext: CanvasRenderingContext2D,
    elementFilters: Array<FilterProperties>,
    elementToDraw: (ctx: CanvasRenderingContext2D) => void,
  ): void => {
    const { copyContext, effectsContext, scratchContext } = FilterRenderer;
    if (!copyContext || !effectsContext || !scratchContext) return;

    mainContext.save();

    // Se não houver filtros para aplicar, apenas desenha no mainContext e retorna.
    if (!elementFilters.length) {
      elementToDraw(mainContext);
      mainContext.restore();
      return;
    }

    const sortedFilters = elementFilters.sort(
      (a, b) => a.priority - b.priority,
    );
    const beforeFilters = sortedFilters.filter((f) => f.applies === "before");
    const afterFilters = sortedFilters.filter((f) => f.applies === "after");

    this.clearContext(scratchContext);
    this.clearContext(effectsContext);
    this.clearContext(copyContext);

    copyContext.drawImage(mainContext.canvas, 0, 0);
    effectsContext.drawImage(copyContext.canvas, 0, 0);

    const filterManager = FilterManager.getInstance();

    for (const filterProperties of beforeFilters) {
      const filterInstance = filterManager.getFilterById(filterProperties.id);
      if (!filterInstance) continue;
      // O filtro desenha seu efeito isolado no scratchContext.
      this.clearContext(scratchContext);
      scratchContext.save();
      filterInstance.apply(scratchContext, filterProperties, elementToDraw);
      scratchContext.restore();
      // Depois é aplicado no effectsContext.
      effectsContext.save();
      effectsContext.globalAlpha = filterProperties.globalAlpha;
      effectsContext.globalCompositeOperation =
        filterProperties.composite as GlobalCompositeOperation;
      effectsContext.drawImage(scratchContext.canvas, 0, 0);
      effectsContext.restore();
    }

    if (afterFilters.length > 0) {
      for (const filterProperties of afterFilters) {
        const filterInstance = filterManager.getFilterById(filterProperties.id);
        if (!filterInstance) continue;

        this.clearContext(scratchContext);
        scratchContext.save();
        filterInstance.apply(scratchContext, filterProperties, elementToDraw);
        scratchContext.restore();

        effectsContext.save();
        effectsContext.globalCompositeOperation = "destination-out";
        effectsContext.drawImage(scratchContext.canvas, 0, 0);
        effectsContext.globalCompositeOperation = "destination-over";
        effectsContext.drawImage(copyContext.canvas, 0, 0);

        effectsContext.globalAlpha = filterProperties.globalAlpha;
        effectsContext.globalCompositeOperation =
          filterProperties.composite as GlobalCompositeOperation;
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
