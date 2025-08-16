import createSliderControl from "src/components/helpers/createSliderControl";
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
      label: "Correção de Cor",
      applies: "after",
      priority: 4,
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

  /** Adiciona cinco controles, para controlar a correção de cores no elemento */
  protected appendFilterControls = (
    container: HTMLDivElement,
    properties: FilterProperties,
    onChange: (newProperties: Partial<FilterProperties>) => void,
  ): void => {
    const brightnessControl = createSliderControl(
      `${this.id}-brightness`,
      "Brilho",
      { min: 0, max: 150, step: 5, value: properties.brightness as number },
      (newValue) => onChange({ brightness: Number(newValue) }),
    );
    const contrastControl = createSliderControl(
      `${this.id}-contrast`,
      "Contraste",
      { min: 0, max: 150, step: 5, value: properties.contrast as number },
      (newValue) => onChange({ contrast: Number(newValue) }),
    );
    const grayScaleControl = createSliderControl(
      `${this.id}-grayscale`,
      "Escala de Cinza",
      { min: 0, max: 100, step: 1, value: properties.grayscale as number },
      (newValue) => onChange({ grayscale: Number(newValue) }),
    );
    const hueControl = createSliderControl(
      `${this.id}-hue`,
      "Matiz",
      { min: 0, max: 360, step: 1, value: properties.hue as number },
      (newValue) => onChange({ hue: Number(newValue) }),
    );
    const saturationControl = createSliderControl(
      `${this.id}-saturation`,
      "Saturação",
      { min: 0, max: 200, step: 1, value: properties.saturation as number },
      (newValue) => onChange({ saturation: Number(newValue) }),
    );
    hueControl.linkEvents();
    saturationControl.linkEvents();
    grayScaleControl.linkEvents();
    brightnessControl.linkEvents();
    contrastControl.linkEvents();
    container.append(
      brightnessControl.element,
      contrastControl.element,
      grayScaleControl.element,
      hueControl.element,
      saturationControl.element,
    );
  };
}


