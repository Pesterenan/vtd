import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "src/components/types";
import { WorkArea } from "src/components/workArea";
import EVENT, { dispatch } from "src/utils/customEvents";

export class HandTool extends Tool {
  private startingPosition: Position | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  draw(): void {}

  equipTool(): void {
    super.equipTool();
  }

  unequipTool(): void {
    super.unequipTool();
  }

  handleMouseDown(evt: MouseEvent): void {
    this.startingPosition = { x: evt.offsetX, y: evt.offsetY };
    super.handleMouseDown(evt);
  }

  handleMouseUp(evt: MouseEvent): void {
    this.startingPosition = null;
    super.handleMouseUp(evt);
  }

  handleMouseMove({ offsetX, offsetY }: MouseEvent): void {
    if (this.startingPosition) {
      const deltaX = offsetX - this.startingPosition.x;
      const deltaY = offsetY - this.startingPosition.y;
      WorkArea.getInstance().offset.x += deltaX;
      WorkArea.getInstance().offset.y += deltaY;
      dispatch(EVENT.UPDATE_WORKAREA);
      this.startingPosition = { x: offsetX, y: offsetY };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
