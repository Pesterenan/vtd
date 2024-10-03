import { Element } from "./element";
import { TElementData } from "./types";

export interface FilterProperty {
  key: string;
  value: undefined | string | number;
}

export abstract class Filter {
  abstract label: string;
  abstract id: string;
  public applies: "before" | "after";
  public isEnabled = false;
  protected globalAlpha = 1.0;

  constructor(applies: "before" | "after") {
    this.applies = applies;
  }

  abstract apply<T extends TElementData>(
    context: CanvasRenderingContext2D,
    element: Element<T>,
  ): void;
  abstract modify(prop: FilterProperty): void;
  abstract getHTML(): HTMLDivElement;
}
