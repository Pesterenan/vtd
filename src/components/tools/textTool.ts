import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "src/components/types";

export class TextTool extends Tool {
  private lastPosition: Position | null = null;

  public equip(): void {
    super.equip();
  }

  public unequip(): void {
    this.lastPosition = null;
    super.unequip();
  }

  public draw(): void {
    if (!this.context || !this.lastPosition) return;
    this.context.save();
    this.context.font = "bold 16px Times New Roman";
    this.context.fillStyle = "black";
    this.context.strokeStyle = "#FFFFFF";
    this.context.lineWidth = 2;
    this.context.strokeText("T|", this.lastPosition.x, this.lastPosition.y);
    this.context.fillText("T|", this.lastPosition.x, this.lastPosition.y);
    this.context.restore();
  }

  public onMouseDown({ offsetX, offsetY }: MouseEvent): void {
    this.eventBus.emit("edit:text", { position: { x: offsetX, y: offsetY } });
  }

  public onMouseMove({ offsetX, offsetY }: MouseEvent): void {
    this.lastPosition = { x: offsetX, y: offsetY };
    this.eventBus.emit("workarea:update");
  }

  public onKeyDown(evt: KeyboardEvent): void {
    if (evt.shiftKey && evt.key === "Enter")  {
      evt.preventDefault();
      this.eventBus.emit("edit:acceptTextChange");
    }
    if (evt.key === "Escape") {
      evt.preventDefault();
      this.eventBus.emit("edit:declineTextChange");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onMouseUp(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyUp(): void {}
}
