/* eslint-disable @typescript-eslint/no-empty-function */
import type { EventBus } from "src/utils/eventBus";
import type { Position } from "../types";

export abstract class Tool {
  protected static DRAGGING_DISTANCE = 5;
  protected canvas: HTMLCanvasElement;
  protected context: CanvasRenderingContext2D | null;
  protected eventBus: EventBus;
  /** Posição do mouse em espaço de tela (relativa ao canvas). Usar apenas para desenhar overlays. */
  protected get mousePos(): Position | null {
    return this.eventBus.request("mouse:position:get")[0] ?? null;
  }
  /** Posição do mouse ajustada para o espaço do canvas (workArea). Usar em toda operação semântica e payloads de eventos. */
  protected canvasPos: Position | null = null;
  protected get workAreaOffset(): Position | null {
    return this.eventBus.request("workarea:offset:get")[0] ?? { x: 0, y: 0 };
  }
  protected get zoomLevel() {
    return this.eventBus.request("zoomLevel:get")[0] ?? 1;
  }

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.eventBus = eventBus;
  }

  public equip(): void {
    this.eventBus.emit("tool:equipped", this);
    this.updatePos();
    this.eventBus.emit("workarea:update");
  }

  public unequip(): void {
    this.eventBus.emit("tool:unequipped", this);
  }

  public abstract draw(): void;

  public onKeyDown(evt: KeyboardEvent): void {
    this.handleKeyDown(evt);
    this.eventBus.emit("workarea:update");
  }
  public onKeyUp(evt: KeyboardEvent): void {
    this.handleKeyUp(evt);
    this.eventBus.emit("workarea:update");
  }

  public onMouseDown(evt: MouseEvent): void {
    this.updatePos(evt);
    this.handleMouseDown(evt);
    this.eventBus.emit("workarea:update");
  }
  public onMouseMove(evt: MouseEvent): void {
    this.updatePos(evt);
    this.handleMouseMove(evt);
    this.eventBus.emit("workarea:update");
  }
  public onMouseUp(evt: MouseEvent): void {
    this.updatePos(evt);
    this.handleMouseUp(evt);
    this.eventBus.emit("workarea:update");
  }

  protected handleKeyDown(_evt: KeyboardEvent): void {}
  protected handleKeyUp(_evt: KeyboardEvent): void {}
  protected handleMouseDown(_evt: MouseEvent): void {}
  protected handleMouseUp(_evt: MouseEvent): void {}
  protected handleMouseMove(_evt: MouseEvent): void {}

  private updatePos(evt?: MouseEvent): void {
    const position =
      this.mousePos ?? (evt ? { x: evt.offsetX, y: evt.offsetY } : null);
    if (!position) return;
    this.canvasPos = this.toCanvas(position);
  }

  /** Converte uma posição do espaço do canvas para o espaço de tela. */
  protected toScreen(world: Position): Position | null {
    return (
      this.eventBus.request("workarea:adjustForScreen", { position: world })[0] ??
      null
    );
  }

  /** Converte uma posição do espaço de tela para o espaço do canvas. */
  protected toCanvas(screen: Position): Position | null {
    return (
      this.eventBus.request("workarea:adjustForCanvas", { position: screen })[0] ??
      null
    );
  }
}
