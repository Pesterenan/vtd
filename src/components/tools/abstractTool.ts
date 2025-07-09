import type { EventBus } from "src/utils/eventBus";

export abstract class Tool {
  protected canvas: HTMLCanvasElement;
  protected context: CanvasRenderingContext2D | null;
  protected eventBus: EventBus;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.eventBus = eventBus;
  }

  public equip(): void {
    this.eventBus.emit("tool:equipped", this);
    this.eventBus.emit("workarea:update");
  }

  public unequip(): void {
    this.eventBus.emit("tool:unequipped", this);
    this.eventBus.emit("workarea:update");
  }

  public abstract draw(): void;
  public abstract onKeyDown(evt: KeyboardEvent): void;
  public abstract onKeyUp(evt: KeyboardEvent): void;
  public abstract onMouseDown(evt: MouseEvent): void;
  public abstract onMouseMove(evt: MouseEvent): void;
  public abstract onMouseUp(evt: MouseEvent): void;
}
