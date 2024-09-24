import EVENT from "../../utils/customEvents";
import { remap } from "../../utils/easing";
import { Position } from "../types";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";

const MIN_ZOOM_LEVEL = 0.1;
const MAX_ZOOM_LEVEL = 2.0;

export class ZoomTool extends Tool {
  private startingPosition: Position | null = null;
  private isZooming = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  draw(): void {
    if (this.context && this.startingPosition) {
      this.context.save();
      this.context.fillStyle = "black";

      this.context.font = "bold 16px serif";
      this.context.fillText(
        `Zoom: ${Number(WorkArea.getInstance().zoomLevel).toFixed(2)}`,
        this.canvas.clientTop + 20,
        this.canvas.clientLeft + 20,
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
