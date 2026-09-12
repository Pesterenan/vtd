import { Tool } from "src/components/tools/abstractTool";
import handIconSvg from "src/assets/icons/hand-tool.svg?raw";
import { svgToCanvasPath, drawCursorIcon } from "src/utils/icons";

export class HandTool extends Tool {
  private static handIcon: Path2D | null = null;

  private static getHandIcon(): Path2D | null {
    if (!this.handIcon) {
      this.handIcon = svgToCanvasPath(handIconSvg);
    }
    return this.handIcon;
  }

  private isPanning = false;

  public equip(): void {
    super.equip();
    this.canvas.style.cursor = "none";
  }

  public unequip(): void {
    this.isPanning = false;
    this.canvas.style.cursor = "";
    super.unequip();
  }

  public draw(): void {
    const ctx = this.context;
    const mousePos = this.mousePos;
    const handIcon = HandTool.getHandIcon();
    if (!ctx || !mousePos || !handIcon) return;

    const fill = this.isPanning ? "lightblue" : "grey";
    drawCursorIcon(ctx, handIcon, mousePos, { fill });
  }

  protected handleMouseDown(_evt: MouseEvent): void {
    this.isPanning = true;
  }
  protected handleMouseUp(_evt: MouseEvent): void {
    this.isPanning = false;
  }
  protected handleMouseMove(evt: MouseEvent): void {
    if (this.isPanning) {
      this.eventBus.emit("workarea:offset:change", {
        position: { x: evt.movementX, y: evt.movementY },
      });
    }
  }
}
