import type { Element } from "src/components/elements/element";
import type { IElementData } from "src/components/types";

export class FilterRenderer {
  private static instance: FilterRenderer | null = null;
  // Usaremos dois canvases que trocam de papel (leitura/escrita)
  private static canvasA: HTMLCanvasElement;
  private static contextA: CanvasRenderingContext2D | null = null;
  private static canvasB: HTMLCanvasElement;
  private static contextB: CanvasRenderingContext2D | null = null;

  constructor({ width, height }: HTMLCanvasElement) {
    FilterRenderer.canvasA = this.createCanvas(width, height);
    FilterRenderer.contextA = FilterRenderer.canvasA.getContext("2d");
    FilterRenderer.canvasB = this.createCanvas(width, height);
    FilterRenderer.contextB = FilterRenderer.canvasB.getContext("2d");
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

  public static applyFiltersInPipeline = (
    mainContext: CanvasRenderingContext2D,
    element: Element<IElementData>,
    elementToDraw: (ctx: CanvasRenderingContext2D) => void,
  ): void => {
    if (!FilterRenderer.contextA || !FilterRenderer.contextB) return;

    const filters = [...element.filters].sort((a, b) => a.priority - b.priority);

    if (filters.length === 0) {
      elementToDraw(mainContext);
      return;
    }

    // Configuração inicial do pipeline
    let readContext = FilterRenderer.contextA;
    let writeContext = FilterRenderer.contextB;
    this.clearContext(readContext);
    this.clearContext(writeContext);

    // Passo 0: Desenha o elemento original como o estado inicial do pipeline
    elementToDraw(writeContext);

    // Passo 1: Executa o pipeline de filtros
    for (const filter of filters) {
      // Troca os buffers: a saída anterior é a entrada atual
      [readContext, writeContext] = [writeContext, readContext];
      this.clearContext(writeContext);

      // O filtro aplica seu efeito, lendo de 'readContext' e escrevendo em 'writeContext'
      filter.apply(writeContext, readContext, elementToDraw);
    }

    // Passo 2: Composição Final
    // O último contexto de escrita ('writeContext') contém a imagem final.
    // O último filtro na lista dita como a composição final é feita.
    const finalFilter = filters[filters.length - 1];
    mainContext.save();
    mainContext.globalAlpha = finalFilter.globalAlpha;
    mainContext.globalCompositeOperation = finalFilter.composite as GlobalCompositeOperation;
    mainContext.drawImage(writeContext.canvas, 0, 0);
    mainContext.restore();
  };

  private static clearContext(context: CanvasRenderingContext2D): void {
    if (!context) return;
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  }
}
