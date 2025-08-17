import createColorControl from "src/components/helpers/createColorControl";
import createSliderControl from "src/components/helpers/createSliderControl";
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

  /** Adiciona quatro controles, ângulo, distância, desfoque e cor, para controlar o efeito */
  protected appendFilterControls(
    container: HTMLDivElement,
    properties: FilterProperties,
    onChange: (newProperties: Partial<FilterProperties>) => void,
  ): void {
    const angleControl = createSliderControl(
      `${this.id}-angle`,
      "Ângulo",
      { min: 0, max: 360, step: 1, value: properties.angle as number },
      (newValue) => onChange({ angle: Number(newValue) }),
    );
    const distanceControl = createSliderControl(
      `${this.id}-distance`,
      "Distância",
      { min: 0, max: 100, step: 1, value: properties.distance as number },
      (newValue) => onChange({ distance: Number(newValue) }),
    );
    const blurControl = createSliderControl(
      `${this.id}-blur`,
      "Desfoque",
      { min: 0, max: 100, step: 1, value: properties.blur as number },
      (newValue) => onChange({ blur: Number(newValue) }),
    );
    const colorControl = createColorControl(
      `${this.id}-color`,
      "Cor da Sombra",
      { value: properties.color as string },
      (newValue) => onChange({ color: newValue }),
    );
    angleControl.linkEvents();
    distanceControl.linkEvents();
    blurControl.linkEvents();
    colorControl.linkEvents();
    container.append(
      angleControl.element,
      distanceControl.element,
      blurControl.element,
      colorControl.element,
    );
  }
}


