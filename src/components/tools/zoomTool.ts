import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "src/components/types";
import { remap } from "src/utils/easing";

const MIN_ZOOM_LEVEL = 0.1;
const MAX_ZOOM_LEVEL = 1.5;

export class ZoomTool extends Tool {
  private startingPosition: Position | null = null;

  public equip(): void {
    super.equip();
  }

  public unequip(): void {
    this.startingPosition = null;
    super.unequip();
  }

  public draw(): void {
    if (!this.context || !this.startingPosition) return;
    const [zoomLevel] = this.eventBus.request("zoomLevel:get");
    this.context.save();
    this.context.font = "bold 16px serif";
    this.context.strokeStyle = "black";
    this.context.fillStyle = "white";
    this.context.beginPath();
    this.context.roundRect(
      this.canvas.clientLeft + 10,
      this.canvas.clientTop + 10,
      90,
      24,
      5,
    );
    this.context.fill();
    this.context.stroke();

    this.context.fillStyle = "black";
    this.context.fillText(
      `Zoom: ${Number(zoomLevel).toFixed(2)}`,
      this.canvas.clientLeft + 16,
      this.canvas.clientTop + 28,
    );
    this.context.restore();
  }

  public onMouseDown(evt: MouseEvent): void {
    const [zoomLevel] = this.eventBus.request("zoomLevel:get");
    const currentZoomPosition = remap(
      MIN_ZOOM_LEVEL,
      MAX_ZOOM_LEVEL,
      0,
      this.canvas.width,
      zoomLevel,
      true,
    );
    this.startingPosition = {
      x: evt.offsetX - currentZoomPosition,
      y: evt.offsetY,
    };
  }

  public onMouseUp(_evt: MouseEvent): void {
    this.startingPosition = null;
  }

  public onMouseMove({ offsetX, offsetY }: MouseEvent): void {
    if (!this.startingPosition) return;
    const deltaX = offsetX - this.startingPosition.x;
    const newZoomLevel = remap(
      0,
      this.canvas.width,
      MIN_ZOOM_LEVEL,
      MAX_ZOOM_LEVEL,
      deltaX,
      true,
    );

    this.eventBus.emit("zoomLevel:change", {
      level: newZoomLevel,
      center: { x: offsetX, y: offsetY },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyDown(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyUp(): void {}
}
