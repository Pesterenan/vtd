import EVENT from "../../utils/customEvents";
import { remap } from "../../utils/easing";
import { Position } from "../types";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";

const MIN_ZOOM_LEVEL = 0.1;
const MAX_ZOOM_LEVEL = 2.0;

export class ZoomTool extends Tool {
  draw(): void {
    throw new Error("Method not implemented.");
  }
  private previousMousePosition: Position | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  initializeTool(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseUp(): void {}

  handleMouseMove({ offsetX }: MouseEvent): void {
    if (this.previousMousePosition && this.canvas) {
      const deltaX = offsetX - this.previousMousePosition.x;
      const newZoomLevel = remap(
        0,
        this.canvas.width * 0.7,
        MIN_ZOOM_LEVEL,
        MAX_ZOOM_LEVEL,
        deltaX,
        true,
      );
      WorkArea.getInstance().zoomLevel = newZoomLevel;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  handleKeyDown(): void {
    if (!this.previousMousePosition && this.canvas) {
      const currentZoomPosition = remap(
        MIN_ZOOM_LEVEL,
        MAX_ZOOM_LEVEL,
        0,
        this.canvas.width * 0.7,
        WorkArea.getInstance().zoomLevel,
        true,
      );
      this.previousMousePosition = this.canvas.mouse.position;
      this.previousMousePosition.x -= currentZoomPosition;
    }
  }

  handleKeyUp(): void {
    this.previousMousePosition = null;
  }
}
