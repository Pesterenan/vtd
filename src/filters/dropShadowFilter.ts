import type { FilterProperties } from "src/filters/filter";
import { Filter } from "src/filters/filter";
import { toRadians } from "src/utils/transforms";

export class DropShadowFilter extends Filter {
  constructor() {
    super("drop-shadow", "Sombra", "before", 1);
  }

  public createDefaultProperties(): FilterProperties {
    return DropShadowFilter.createDefaultProperties();
  }

  public static createDefaultProperties(): FilterProperties {
    return {
      id: "drop-shadow",
      composite: "source-over",
      globalAlpha: 1.0,
      angle: 45,
      distance: 20,
      blur: 10,
      color: "#000000",
    };
  }

  /** Utiliza a propriedade 'shadow' do canvas para criar uma sombra embaixo do elemento */
  protected filterEffects(
    context: CanvasRenderingContext2D,
    properties: FilterProperties,
    elementToDraw: (ctx: CanvasRenderingContext2D) => void,
  ): void {
    const { color, blur, distance, angle, globalAlpha } = properties;
    context.shadowColor = color as string;
    context.shadowBlur = blur as number;
    context.shadowOffsetX =
      (distance as number) * Math.sin(toRadians(angle as number));
    context.shadowOffsetY =
      (distance as number) * Math.cos(toRadians(angle as number));
    context.globalAlpha = globalAlpha;
    elementToDraw(context);
  }


}


