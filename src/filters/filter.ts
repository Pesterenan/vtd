export type FilterProperty = string | number | undefined;

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

  protected abstract filterEffects(
    context: CanvasRenderingContext2D,
    properties: FilterProperties,
    elementToDraw: (context: CanvasRenderingContext2D) => void,
  ): void;
}

