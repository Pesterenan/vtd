import { Tool } from "src/components/tools/abstractTool";
import { remap } from "src/utils/easing";
import zoomIconSvg from "src/assets/icons/zoom-tool.svg?raw";
import { svgToCanvasPath, ICON_SIZE } from "src/utils/icons";

const MIN_ZOOM_LEVEL = 0.1;
const MAX_ZOOM_LEVEL = 2.0;

export class ZoomTool extends Tool {
  private startingX: number | null = null;

  public equip(): void {
    super.equip();
    this.canvas.style.cursor = "none";
  }

  public unequip(): void {
    this.startingX = null;
    this.canvas.style.cursor = "";
    super.unequip();
  }

  public draw(): void {
    const mousePos = this.mousePos;
    const zoomIcon = svgToCanvasPath(zoomIconSvg);
    if (!this.context || !mousePos || !zoomIcon) return;
    const ctx = this.context;

    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "white";
    ctx.fillStyle = this.startingX !== null ? "lightblue" : "grey";

    ctx.translate(mousePos.x - ICON_SIZE / 2, mousePos.y - ICON_SIZE / 2);
    ctx.stroke(zoomIcon);
    ctx.fill(zoomIcon, "evenodd");
    ctx.restore();

    if (this.startingX === null) return;

    ctx.save();
    ctx.font = "bold 16px serif";
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.roundRect(
      this.canvas.clientLeft + 10,
      this.canvas.clientTop + 10,
      90,
      24,
      5,
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.fillText(
      `Zoom: ${Number(this.zoomLevel).toFixed(2)}`,
      this.canvas.clientLeft + 16,
      this.canvas.clientTop + 28,
    );
    ctx.restore();
  }

  protected handleMouseDown(evt: MouseEvent): void {
    const currentZoomPosition = remap(
      MIN_ZOOM_LEVEL,
      MAX_ZOOM_LEVEL,
      0,
      this.canvas.width,
      this.zoomLevel,
      true,
    );
    this.startingX = evt.offsetX - currentZoomPosition;
  }

  protected handleMouseUp(_evt: MouseEvent): void {
    this.startingX = null;
  }

  protected handleMouseMove(evt: MouseEvent): void {
    if (this.startingX === null) return;
    const deltaX = evt.offsetX - this.startingX;
    const newZoomLevel = remap(
      0,
      this.canvas.width,
      MIN_ZOOM_LEVEL,
      MAX_ZOOM_LEVEL,
      deltaX,
      true,
    );

    this.eventBus.emit("zoomLevel:change", {
      level: newZoomLevel,
      center: { x: evt.offsetX, y: evt.offsetY },
    });
  }
}
