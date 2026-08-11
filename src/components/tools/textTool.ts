import { Tool } from "src/components/tools/abstractTool";

export class TextTool extends Tool {
  public equip(): void {
    super.equip();
  }

  public unequip(): void {
    super.unequip();
  }

  public draw(): void {
    const mousePos = this.mousePos;
    if (!this.context || !mousePos) return;
    this.context.save();
    this.context.font = "bold 16px Times New Roman";
    this.context.fillStyle = "black";
    this.context.strokeStyle = "#FFFFFF";
    this.context.lineWidth = 2;
    this.context.strokeText("T|", mousePos.x, mousePos.y);
    this.context.fillText("T|", mousePos.x, mousePos.y);
    this.context.restore();
  }

  protected handleMouseDown(evt: MouseEvent): void {
    this.eventBus.emit("edit:text", {
      position: this.mousePos ?? { x: evt.offsetX, y: evt.offsetY },
    });
  }

  protected handleKeyDown(evt: KeyboardEvent): void {
    if (evt.shiftKey && evt.key === "Enter") {
      evt.preventDefault();
      this.eventBus.emit("edit:acceptTextChange");
    }
    if (evt.key === "Escape") {
      evt.preventDefault();
      this.eventBus.emit("edit:declineTextChange");
    }
  }
}
