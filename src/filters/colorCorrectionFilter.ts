import type { FilterProperties } from "./filter";
import { Filter } from "./filter";

export class ColorCorrectionFilter extends Filter {
  constructor() {
    super("color-correction", "Correção de Cor", "after", 4);
  }

  public createDefaultProperties(): FilterProperties {
    return ColorCorrectionFilter.createDefaultProperties();
  }

  public static createDefaultProperties(): FilterProperties {
    return {
      id: "color-correction",
      composite: "source-over",
      globalAlpha: 1.0,
      brightness: 100,
      contrast: 100,
      grayscale: 0,
      hue: 0,
      saturation: 100,
    };
  }

  /** Utiliza a propriedade 'filter' do canvas para fazer a correção de cores do elemento */
  protected filterEffects = (
    context: CanvasRenderingContext2D,
    properties: FilterProperties,
    elementToDraw: (ctx: CanvasRenderingContext2D) => void,
  ): void => {
    const { grayscale, hue, saturation, brightness, contrast, globalAlpha } =
      properties;
    context.filter = `grayscale(${grayscale}%) hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%) contrast(${contrast}%)`;
    context.globalAlpha = globalAlpha;
    elementToDraw(context);
  };


}


