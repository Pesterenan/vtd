import type { FilterProperties } from "src/filters/filter";
import { Filter } from "src/filters/filter";

export class OuterGlowFilter extends Filter {
  constructor() {
    super("outer-glow", "Luz Brilhante (Fora)", "before", 2);
  }

  public createDefaultProperties(): FilterProperties {
    return OuterGlowFilter.createDefaultProperties();
  }

  public static createDefaultProperties(): FilterProperties {
    return {
      id: "outer-glow",
      composite: "source-over",
      globalAlpha: 1.0,
      blur: 10,
      color: "#FFFAAA",
    };
  }

  /** Utiliza a propriedade 'shadow' do canvas para criar um brilho em volta do elemento */
  protected filterEffects = (
    context: CanvasRenderingContext2D,
    properties: FilterProperties,
    elementToDraw: (ctx: CanvasRenderingContext2D) => void,
  ): void => {
    const { color, blur, globalAlpha } = properties;
    context.shadowColor = color as string;
    context.shadowBlur = blur as number;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.globalAlpha = globalAlpha;
    elementToDraw(context);
  };


}
