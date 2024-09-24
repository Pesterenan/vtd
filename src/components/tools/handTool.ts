import EVENT from "../../utils/customEvents";
import { Position } from "../types";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";

export class HandTool extends Tool {
  private startingPosition: Position | null = null;
  private isMoving = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  draw(): void {}

  equipTool(): void {
    super.equipTool();
  }

  unequipTool(): void {
    super.unequipTool();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(evt: MouseEvent): void {
    this.isMoving = true;
    this.startingPosition = { x: evt.offsetX, y: evt.offsetY };
    super.handleMouseDown();
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseUp(): void {
    this.startingPosition = null;
    super.handleMouseUp();
  }

  handleMouseMove({ offsetX, offsetY }: MouseEvent): void {
    if (this.startingPosition && this.isMoving) {
      const deltaX = offsetX - this.startingPosition.x;
      const deltaY = offsetY - this.startingPosition.y;
      WorkArea.getInstance().offset.x += deltaX;
      WorkArea.getInstance().offset.y += deltaY;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      this.startingPosition = { x: offsetX, y: offsetY };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
