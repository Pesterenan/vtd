import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "src/components/types";

export class HandTool extends Tool {
  private lastPosition: Position | null = null;

  public equip(): void {
    super.equip();
  }

  public unequip(): void {
    this.lastPosition = null;
    super.unequip();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public draw(): void {}

  public onMouseDown({ offsetX, offsetY }: MouseEvent): void {
    this.lastPosition = { x: offsetX, y: offsetY };
  }

  public onMouseUp(): void {
    this.lastPosition = null;
  }

  public onMouseMove({ offsetX, offsetY }: MouseEvent): void {
    if (this.lastPosition) {
      const x = offsetX - this.lastPosition.x;
      const y = offsetY - this.lastPosition.y;
      this.eventBus.emit("workarea:offset:change", { delta: { x, y } });
      this.lastPosition = { x: offsetX, y: offsetY };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyDown(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyUp(): void {}
}
