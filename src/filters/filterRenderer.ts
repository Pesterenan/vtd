import type { Size } from "src/components/types";
import type { Filter, FilterProperties } from "./filter";
import { FilterManager } from "./filterManager";

export class FilterRenderer {
  private static instance: FilterRenderer | null = null;
  private static copyCanvas: HTMLCanvasElement;
  private static copyContext: CanvasRenderingContext2D | null = null;
  private static effectsCanvas: HTMLCanvasElement;
  private static effectsContext: CanvasRenderingContext2D | null = null;
  private static scratchCanvas: HTMLCanvasElement;
  private static scratchContext: CanvasRenderingContext2D | null = null;

  /** Utiliza a largura e altura do WorkArea atual para criar 3 canvas para renderizar
  * os efeitos aplicados aos elementos */
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

  public static getInstance(mainCanvas: HTMLCanvasElement): FilterRenderer {
    if (FilterRenderer.instance === null) {
      FilterRenderer.instance = new FilterRenderer(mainCanvas);
    }
    return FilterRenderer.instance;
  }

  /** Função auxiliar para criar um novo elemento de canvas com largura e altura */
  private createCanvas(width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /** Atualiza o tamanho dos 3 canvas internos de acordo com o novo tamanho do WorkArea */
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

  /** Aplica as propriedades de filtro do elemento para desenhar no WorkArea */
  public static applyFilters = (
    mainContext: CanvasRenderingContext2D,
    elementFilters: Array<FilterProperties>,
    elementToDraw: (ctx: CanvasRenderingContext2D) => void,
  ): void => {
    const { copyContext, effectsContext, scratchContext } = FilterRenderer;
    if (!copyContext || !effectsContext || !scratchContext) return;

    mainContext.save();

    // Caso não haja filtros, apenas desenha o elemento e retorna.
    if (!elementFilters.length) {
      elementToDraw(mainContext);
      mainContext.restore();
      return;
    }

    const filterManager = FilterManager.getInstance();

    // Separa os filtros em os que são aplicados antes do elemento (embaixo) e depois (em cima)
    const { beforeFilters, afterFilters } = elementFilters.reduce(
      (acc, props) => {
        const instance = filterManager.getFilterById(props.id);
        if (instance) {
          const hydratedFilter = { props, instance };
          if (instance.applies === "before") {
            acc.beforeFilters.push(hydratedFilter);
          } else {
            acc.afterFilters.push(hydratedFilter);
          }
        }
        return acc;
      },
      { beforeFilters: [], afterFilters: [] } as {
        beforeFilters: { props: FilterProperties; instance: Filter }[];
        afterFilters: { props: FilterProperties; instance: Filter }[];
      },
    );

    beforeFilters.sort((a, b) => a.instance.priority - b.instance.priority);
    afterFilters.sort((a, b) => a.instance.priority - b.instance.priority);

    this.clearContext(scratchContext);
    this.clearContext(effectsContext);
    this.clearContext(copyContext);

    // Faz uma cópia do estado anterior do canvas principal antes de começar a aplicar
    copyContext.drawImage(mainContext.canvas, 0, 0);
    // Desenha essa cópia no fundo do effectsContext para composição
    effectsContext.drawImage(copyContext.canvas, 0, 0);

    for (const { props, instance } of beforeFilters) {
      this.clearContext(scratchContext);
      scratchContext.save();
      // Desenha o efeito no scratchCanvas
      instance.apply(scratchContext, props, elementToDraw);
      scratchContext.restore();

      effectsContext.save();
      effectsContext.globalAlpha = props.globalAlpha;
      effectsContext.globalCompositeOperation =
        props.composite as GlobalCompositeOperation;
      // Agora com a composição correta, e com o effects já tendo a cópia do estado anterior
      // desenha o efeito por cima do effectsCanvas
      effectsContext.drawImage(scratchContext.canvas, 0, 0);
      effectsContext.restore();
    }

    if (afterFilters.length > 0) {
      for (const { props, instance } of afterFilters) {
        this.clearContext(scratchContext);
        scratchContext.save();
        // Aplica os efeitos de filtro no scratchContext
        instance.apply(scratchContext, props, elementToDraw);
        scratchContext.restore();

        effectsContext.save();
        effectsContext.globalCompositeOperation = "destination-out";
        // Desenha o scratchContext 'por fora' do effectsContext
        effectsContext.drawImage(scratchContext.canvas, 0, 0);
        effectsContext.globalCompositeOperation = "destination-over";
        // Depois a cópia do estado anterior 'por dentro' do effectsContext
        effectsContext.drawImage(copyContext.canvas, 0, 0);

        effectsContext.globalAlpha = props.globalAlpha;
        effectsContext.globalCompositeOperation =
          props.composite as GlobalCompositeOperation;
        // E então desenha o elemento com a composição correta por cima da cópia
        effectsContext.drawImage(scratchContext.canvas, 0, 0);
        effectsContext.restore();
      }
    } else {
      // Caso não tenha filtros 'after' apenas desenha o elemento em cima
      elementToDraw(effectsContext);
    }

    // Finalmente, desenha toda a aplicação de efeitos de volta ao WorkArea
    mainContext.drawImage(effectsContext.canvas, 0, 0);
    mainContext.restore();
  };

  /** Função auxiliar para limpar um canvas */
  private static clearContext(context: CanvasRenderingContext2D): void {
    if (!context) return;
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  }
}
