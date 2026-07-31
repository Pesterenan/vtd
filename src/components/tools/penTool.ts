import type { Point, Position } from "../types";
import { Tool } from "./abstractTool";

type PenState = "IDLE" | "DRAWING";
export class PenTool extends Tool {
  private state: PenState = "IDLE";
  private cursorPos: Position | null = null;
  private points: Point[] = [];
  private isClosing = false;
  private readonly CLOSE_DISTANCE = 8;

  public equip(): void {
    super.equip();
    if (this.canvas) this.canvas.style.cursor = "crosshair";
  }

  public unequip(): void {
    if (this.state === "DRAWING" && this.points.length >= 2) {
      this.finalizePath(false);
    } else {
      this.discardPath();
    }
    if (this.canvas) this.canvas.style.cursor = "";
    super.unequip();
  }

  private discardPath() {
    if (this.state === "DRAWING" && this.points.length >= 2) {
      this.eventBus.emit("alert:add", {
        type: "success",
        message: "Caminho descartado",
      });
      this.points = [];
      this.cursorPos = null;
      this.state = "IDLE";
      this.eventBus.emit("workarea:update");
    }
  }

  private finalizePath(isClosed: boolean) {
    let minX = -Infinity;
    let minY = -Infinity;
    let maxX = Infinity;
    let maxY = Infinity;
    this.points.forEach((p) => {
      minX = Math.max(minX, p.x);
      minY = Math.max(minY, p.y);
      maxX = Math.min(maxX, p.x);
      maxY = Math.min(maxY, p.y);
    });
    const [center] = this.eventBus.request("workarea:adjustForCanvas", {
      position: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    });
    const [points] = this.points.map((p) =>
      this.eventBus.request("workarea:adjustForCanvas", {
        position: { x: p.x, y: p.y },
      }),
    );
    this.eventBus.emit("edit:path", { position: center, points, isClosed });
  }

  public draw(): void {
    this.context.save();
    this.context.beginPath();
    for (const { x, y } of this.points) {
      this.context.strokeStyle = "#202020";
      this.context.lineWidth = 2;
      this.context.lineTo(x, y);

      this.context.strokeStyle = "#000000";
      this.context.fillStyle = "#FFFFFF";
      this.context.arc(x, y, 3, 0, 2 * Math.PI);
      this.context.fill();
      this.context.stroke();
    }

    if (this.cursorPos) {
      this.context.globalAlpha = 0.5;
      this.context.setLineDash([5, 5]);
      this.context.lineWidth = 2;
      this.context.lineTo(this.cursorPos.x, this.cursorPos.y);
      this.context.strokeStyle = "#000000";
      this.context.stroke();
    }

    this.context.closePath();
    // Check if its closing the path
    if (this.isClosing) {
      this.context.strokeStyle = "#000000";
      this.context.fillStyle = "#0078D7";
      this.context.arc(this.points[0].x, this.points[0].y, 6, 0, 2 * Math.PI);
      this.context.fill();
      this.context.stroke();
    }
    this.context.restore();
  }

  public onKeyDown(evt: KeyboardEvent): void {
    if (evt.code === "Enter") {
      this.finalizePath(false);
    }
    if (evt.code === "Escape") {
      this.discardPath();
    }
    if (evt.code === "Backspace") {
      this.points.pop();
      if (this.points.length === 0) {
        this.state = "IDLE";
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyUp(_evt: KeyboardEvent): void {}

  public onMouseDown(evt: MouseEvent): void {
    if (evt.button !== 0) return;
    if (this.state === "IDLE") {
      this.points.push({ x: evt.offsetX, y: evt.offsetY });
      this.state = "DRAWING";
    } else if (this.state === "DRAWING") {
      const dx = this.points[0].x - evt.offsetX;
      const dy = this.points[0].y - evt.offsetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.isClosing = dist <= this.CLOSE_DISTANCE && this.points.length >= 2;
      this.points.push({ x: evt.offsetX, y: evt.offsetY });
      if (this.isClosing) {
        this.finalizePath(true);
      }
    }
  }

  public onMouseMove(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    this.cursorPos = { x: offsetX, y: offsetY };
    if (this.state === "DRAWING") {
      this.eventBus.emit("workarea:update");
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onMouseUp(_evt: MouseEvent): void {}
}
