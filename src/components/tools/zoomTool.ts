import EVENT from "src/utils/customEvents";
import { remap } from "src/utils/easing";
import type { Position } from "src/components/types";
import { WorkArea } from "src/components/workArea";
import { Tool } from "src/components/tools/abstractTool";

const MIN_ZOOM_LEVEL = 0.1;
const MAX_ZOOM_LEVEL = 2.0;

export class ZoomTool extends Tool {
  private startingPosition: Position | null = null;
  private isZooming = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  draw(): void {
    if (this.context && this.startingPosition) {
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
        `Zoom: ${Number(WorkArea.getInstance().zoomLevel).toFixed(2)}`,
        this.canvas.clientLeft + 16,
        this.canvas.clientTop + 28,
      );
      this.context.restore();
    }
  }

  equipTool(): void {
    this.draw();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    super.equipTool();
  }

  unequipTool(): void {
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    super.unequipTool();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(evt: MouseEvent): void {
    this.isZooming = true;
    const currentZoomPosition = remap(
      MIN_ZOOM_LEVEL,
      MAX_ZOOM_LEVEL,
      0,
      this.canvas.width,
      WorkArea.getInstance().zoomLevel,
      true,
    );
    this.startingPosition = {
      x: evt.offsetX - currentZoomPosition,
      y: evt.offsetY,
    };
    super.handleMouseDown();
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseUp(): void {
    this.startingPosition = null;
    this.isZooming = false;
    super.handleMouseUp();
  }

  handleMouseMove({ offsetX }: MouseEvent): void {
    if (this.startingPosition && this.isZooming) {
      const deltaX = offsetX - this.startingPosition.x;
      const newZoomLevel = remap(
        0,
        this.canvas.width,
        MIN_ZOOM_LEVEL,
        MAX_ZOOM_LEVEL,
        deltaX,
        true,
      );

      WorkArea.getInstance().zoomLevel = newZoomLevel;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
