import { Tool } from "src/components/tools/abstractTool";
import handIconSvg from "src/assets/icons/hand-tool.svg?raw";
import { svgToCanvasPath, ICON_SIZE } from "src/utils/icons";

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
    const mousePos = this.mousePos;
    const handIcon = HandTool.getHandIcon();
    if (!this.context || !mousePos || !handIcon) return;

    const ctx = this.context;

    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "white";
    ctx.fillStyle = this.isPanning ? "lightblue" : "grey";

    ctx.translate(mousePos.x - ICON_SIZE / 2, mousePos.y - ICON_SIZE / 2);
    ctx.stroke(handIcon);
    ctx.fill(handIcon);
    ctx.restore();
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

