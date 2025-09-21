import type { ISelectOption } from "src/components/helpers/createSelectInput";
import createSelectInput from "src/components/helpers/createSelectInput";
import createSliderControl from "src/components/helpers/createSliderControl";

export type FilterProperty = string | number | undefined;
export const COMPOSITE_OPTIONS: Array<ISelectOption> = [
  { label: "Normal", value: "source-over" },
  { label: "Clarear", value: "lighten" },
  { label: "Cor", value: "color" },
  { label: "Diferença", value: "difference" },
  { label: "Escape de Cor", value: "color-dodge" },
  { label: "Escurecer", value: "darken" },
  { label: "Exclusão", value: "exclusion" },
  { label: "Luminosidade", value: "luminosity" },
  { label: "Luz Forte", value: "hard-light" },
  { label: "Luz Suave", value: "soft-light" },
  { label: "Mais Claro", value: "lighter" },
  { label: "Matiz", value: "hue" },
  { label: "Multiplicação", value: "multiply" },
  { label: "Queima de Cor", value: "color-burn" },
  { label: "Saturação", value: "saturation" },
  { label: "Sobreposição", value: "overlay" },
  { label: "Tela", value: "screen" },
] as const;

export type FilterProperties = {
  id: string;
  composite: string;
  globalAlpha: number;
  [key: string]: string | number | boolean | undefined;
};

export abstract class Filter {
  public readonly id: string;
  public readonly label: string;
  public readonly applies: "before" | "after";
  public readonly priority: number;

  // The constructor now only sets the readonly, stateless properties.
  constructor(
    id: string,
    label: string,
    applies: "before" | "after",
    priority: number,
  ) {
    this.id = id;
    this.label = label;
    this.applies = applies;
    this.priority = priority;
  }

  public abstract createDefaultProperties(): FilterProperties;

  // The 'apply' method now receives the properties from the element.
  public apply(
    context: CanvasRenderingContext2D,
    properties: FilterProperties,
    elementToDraw: (context: CanvasRenderingContext2D) => void,
  ): void {
    // The specific filter effects are now passed the properties.
    this.filterEffects(context, properties, elementToDraw);
  }

  // 'setupFilterControls' now receives properties to populate the UI.
  public setupFilterControls(
    properties: FilterProperties,
    onChange: (newProperties: Partial<FilterProperties>) => void,
  ): HTMLDivElement {
    // Note: In a stateless world, we might want to recreate controls each time
    // or be very careful about updating them. For now, we'll clear and recreate.
    const filterControls = document.createElement("div");
    filterControls.className = "sec_menu-style pad-05";
    filterControls.id = `${this.id}-filter-controls`;

    const compositeControl = createSelectInput(
      `${this.id}-composite-select`,
      "Composição",
      { optionValues: COMPOSITE_OPTIONS, value: properties.composite },
      (newValue) => onChange({ composite: newValue }),
    );

    const opacityControl = createSliderControl(
      `${this.id}-opacity`,
      "Opacidade",
      { min: 0, max: 1, step: 0.01, value: properties.globalAlpha },
      (newValue) => onChange({ globalAlpha: Number(newValue) }),
    );

    compositeControl.enable();
    opacityControl.enable();
    filterControls.append(compositeControl.element);
    filterControls.append(opacityControl.element);

    // The subclass will append its own specific controls.
    this.appendFilterControls(filterControls, properties, onChange);

    return filterControls;
  }

  // Abstract methods are updated to receive the properties object.
  protected abstract filterEffects(
    context: CanvasRenderingContext2D,
    properties: FilterProperties,
    elementToDraw: (context: CanvasRenderingContext2D) => void,
  ): void;

  protected abstract appendFilterControls(
    container: HTMLDivElement,
    properties: FilterProperties,
    onChange: (newProperties: Partial<FilterProperties>) => void,
  ): void;
}

