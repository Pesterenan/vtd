import EVENT from "src/utils/customEvents";
import type { Position } from "src/components/types";
import { WorkArea } from "src/components/workArea";
import { Tool } from "src/components/tools/abstractTool";

export class HandTool extends Tool {
  private startingPosition: Position | null = null;

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
    this.startingPosition = { x: evt.offsetX, y: evt.offsetY };
    super.handleMouseDown();
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseUp(): void {
    this.startingPosition = null;
    super.handleMouseUp();
  }

  handleMouseMove({ offsetX, offsetY }: MouseEvent): void {
    if (this.startingPosition) {
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
