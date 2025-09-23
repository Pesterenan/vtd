import createColorControl from "src/components/helpers/createColorControl";
import createSliderControl from "src/components/helpers/createSliderControl";
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

  /** Adiciona dois controles, desfoque e seletor de cor para controlar o efeito */
  protected appendFilterControls(
    container: HTMLDivElement,
    properties: FilterProperties,
    onChange: (newProperties: Partial<FilterProperties>) => void,
  ): void {
    const blurControl = createSliderControl(
      `${this.id}-blur`,
      "Desfoque",
      { min: 0, max: 100, step: 1, value: properties.blur as number },
      (newValue) => onChange({ blur: Number(newValue) }),
    );
    const colorControl = createColorControl(
      `${this.id}-color`,
      "Cor",
      { value: properties.color as string },
      (newValue) => onChange({ color: newValue }),
    );
    blurControl.enable();
    colorControl.linkEvents();
    container.append(blurControl.element, colorControl.element);
  }
}
