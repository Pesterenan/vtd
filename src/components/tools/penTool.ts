import { toRadians } from "src/utils/transforms";
import type { Point, Position } from "../types";
import { Tool } from "./abstractTool";
import type { EventBus } from "src/utils/eventBus";
import penIconSvg from "src/assets/icons/pen-tool.svg?raw";
import { svgToCanvasPath, ICON_SIZE } from "src/utils/icons";
import { PathElement } from "../elements/pathElement";
import { Vector } from "src/utils/vector";

export class PenTool extends Tool {
  private points: Point[] = [];
  private activePathElement: PathElement | null = null;
  private selectedPointIndex = -1;
  private isClosing = false;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    super(canvas, eventBus);
  }

  public equip(): void {
    super.equip();
    this.eventBus.on("workarea:selectById", this.selectActivePath);
    this.eventBus.on("workarea:selectAt", this.selectActivePath);
    this.canvas.style.cursor = "none";
  }

  public unequip(): void {
    this.eventBus.off("workarea:selectById", this.selectActivePath);
    this.eventBus.off("workarea:selectAt", this.selectActivePath);
    this.canvas.style.cursor = "";
    this.reset();
  }
  private reset(): void {
    this.points= [];
    this.activePathElement= null;
    this.selectedPointIndex = -1;
    this.isClosing = false;
  }

  private selectActivePath = (): void => {
    const [selectedElements] = this.eventBus.request("workarea:selected:get");
    if (
      selectedElements?.length === 1 &&
      selectedElements[0] instanceof PathElement
    ) {
      this.reset();
      this.activePathElement = selectedElements[0];
      this.updatePointsOverlay();
    } else {
      this.reset();
    }
  };

  private updatePointsOverlay = (): void => {
    if (this.activePathElement) {
      this.points = this.activePathElement.points.map(
        (local) => this.toScreen(local) as Position,
      );
      this.selectedPointIndex = this.points.length - 1;
      this.eventBus.emit("workarea:update");
    }
  };

  private drawClosingIndicator(): void {
    if (this.isClosing && this.activePathElement && this.points.length > 0) {
      const firstPoint = this.toScreen(this.activePathElement.points[0]) ?? this.points[0];
      const ctx = this.context;
      if (!ctx || !firstPoint) return;

      ctx.save();
      ctx.translate(firstPoint.x, firstPoint.y);
      ctx.fillStyle = "blue";
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public draw(): void {
    const mousePos = this.mousePos;
    const canvasPos = this.canvasPos;
    const penIcon = svgToCanvasPath(penIconSvg);
    const ctx = this.context;
    if (!ctx || !mousePos || !penIcon || !canvasPos) return;

    ctx.save();
    if (this.activePathElement) {
      const translation = this.toScreen(this.activePathElement?.position);
      if (translation && this.workAreaOffset) {
        ctx.translate(
          translation.x - this.workAreaOffset.x,
          translation.y - this.workAreaOffset.y,
        );
      }
    }
    // Draw path lines
    if (this.points.length >= 2) {
      ctx.beginPath();
      drawLine(ctx, this.points);
      ctx.closePath();
    }

    // Draw points on top of lines
    if (this.points.length > 0) {
      this.points.forEach((point, index) => {
        drawPoint(ctx, point, index, this.selectedPointIndex);
      });
    }
    // Move to last point
    if (this.selectedPointIndex !== -1) {
      ctx.moveTo(
        this.points[this.selectedPointIndex].x,
        this.points[this.selectedPointIndex].y,
      );
      ctx.restore();
    }
    // Draw line to pen tool
    if (this.points.length > 0) {
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = "gray";
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.stroke();
      ctx.restore();
    }
    // Draw pen icon
    drawPen(ctx, mousePos, penIcon);

    this.drawClosingIndicator();
  }

  protected handleMouseDown(_evt: MouseEvent): void {
    if (!this.activePathElement) {
      this.eventBus.emit("edit:path", {
        position: this.canvasPos ?? { x: 0, y: 0 },
      });
    } else {
      if (this.canvasPos) {
        this.activePathElement.addPoint(this.canvasPos);
        this.updatePointsOverlay();
      } else if (this.isClosing && !this.activePathElement.isClosed) {
        this.activePathElement.isClosed = true;
        this.updatePointsOverlay();
      }
    }
  }

  protected handleMouseMove(): void {
    if (this.mousePos && this.activePathElement) {
      const firstPointScreen = this.toScreen(this.activePathElement.points[0]) ?? this.points[0];
      const distOffseted = new Vector(
        { x: this.mousePos.x + (this.workAreaOffset?.x ?? 0), y: this.mousePos.y + (this.workAreaOffset?.y ?? 0) }
      ).distance(firstPointScreen as Position);
      this.isClosing = distOffseted <= PenTool.DRAGGING_DISTANCE;
    } else {
      this.isClosing = false;
    }
  }
}

// Drawing
function drawPen(
  ctx: CanvasRenderingContext2D,
  mousePos: Point,
  penIcon: Path2D,
) {
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "white";
  ctx.fillStyle = "grey";

  ctx.translate(mousePos.x - ICON_SIZE / 3 - 2, mousePos.y + ICON_SIZE / 3);
  ctx.rotate(toRadians(-45));
  ctx.stroke(penIcon);
  ctx.fill(penIcon);
  ctx.restore();
}

function drawPoint(
  ctx: CanvasRenderingContext2D,
  point: Point,
  index: number,
  selected: number,
) {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.fillStyle = index === selected ? "red" : "black";
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function drawLine(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.save();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  for (const point of points) {
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
  ctx.restore();
}
