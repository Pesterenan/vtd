import EVENT from "../../utils/customEvents";
import { Position } from "../types";
import { Tool } from "./abstractTool";

export class HandTool extends Tool {
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

  handleMouseMove(event: MouseEvent): void {
    if (this.previousMousePosition) {
      const { offsetX, offsetY } = event;
      const deltaX = offsetX - this.previousMousePosition.x;
      const deltaY = offsetY - this.previousMousePosition.y;
      this.canvas.offset.x += deltaX;
      this.canvas.offset.y += deltaY;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      this.previousMousePosition = { x: offsetX, y: offsetY };
    }
  }

  handleKeyDown(): void {
    if (!this.previousMousePosition) {
      this.previousMousePosition = this.canvas.mouse.position;
    }
  }

  handleKeyUp(): void {
    this.previousMousePosition = null;
  }
}
