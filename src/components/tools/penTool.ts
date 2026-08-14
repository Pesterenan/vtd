import { toRadians } from "src/utils/transforms";
import type { Point, Position } from "../types";
import { Tool } from "./abstractTool";
import type { EventBus } from "src/utils/eventBus";
import penIconSvg from "src/assets/icons/pen-tool.svg?raw";
import { svgToCanvasPath, ICON_SIZE } from "src/utils/icons";
import { PathElement } from "../elements/pathElement";
import { Vector } from "src/utils/vector";

const CLOSING_DISTANCE = 20;
const POINT_HIT_DISTANCE = 8;
const POINT_DRAG_DISTANCE = 5;
const KEY_NUDGE_STEP = 1;
const KEY_NUDGE_STEP_SHIFT = 10;

export class PenTool extends Tool {
  private points: Point[] = [];
  private activePathElement: PathElement | null = null;
  private selectedPointIndex = -1;
  private hoveredPointIndex = -1;
  private draggingPointIndex = -1;
  private mouseDownScreen: Position | null = null;
  private dragStarted = false;
  private isClosing = false;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    super(canvas, eventBus);
  }

  public equip(): void {
    super.equip();
    this.resetTool();
    this.selectActivePath();
    this.eventBus.on("workarea:selectById", this.selectActivePath);
    this.eventBus.on("workarea:selectAt", this.selectActivePath);
    this.eventBus.on("workarea:deleteElement", this.resetTool);
    this.canvas.style.cursor = "none";
  }

  public unequip(): void {
    this.resetTool();
    super.unequip();
    this.eventBus.off("workarea:selectById", this.selectActivePath);
    this.eventBus.off("workarea:selectAt", this.selectActivePath);
    this.eventBus.off("workarea:deleteElement", this.resetTool);
    this.canvas.style.cursor = "";
    this.resetTool();
  }
  private resetTool(): void {
    this.points = [];
    this.activePathElement = null;
    this.selectedPointIndex = -1;
    this.hoveredPointIndex = -1;
    this.draggingPointIndex = -1;
    this.mouseDownScreen = null;
    this.dragStarted = false;
    this.isClosing = false;
    this.eventBus.emit("workarea:update");
  }

  private selectActivePath = (): void => {
    const [selectedElements] = this.eventBus.request("workarea:selected:get");
    if (
      selectedElements?.length === 1 &&
      selectedElements[0] instanceof PathElement
    ) {
      this.activePathElement = selectedElements[0];
      this.updatePointsOverlay();
      this.selectedPointIndex = this.points.length - 1;
    } else {
      this.resetTool();
    }
  };

  private updatePointsOverlay = (): void => {
    if (this.activePathElement) {
      this.points = this.activePathElement.points.map(
        (local) => this.toScreen(local) as Position,
      );
      this.eventBus.emit("workarea:update");
    }
  };

  private refreshTransformBox = (): void => {
    this.eventBus.emit("transformBox:refresh");
  };

  private closePath = (): void => {
    if (!this.activePathElement) return;
    this.activePathElement.isClosed = true;
    this.selectedPointIndex = -1;
    this.updatePointsOverlay();
  };

  private pointScreenPosition(index: number): Position | null {
    if (!this.activePathElement) return null;
    return this.toScreen(
      this.activePathElement.toWorld(this.activePathElement.points[index]),
    );
  }

  /** Acha o ponto sob o cursor. O primeiro é reservado ao fechamento, então não conta. */
  private hitTestPoint(): number {
    const mousePos = this.mousePos;
    if (!mousePos || !this.activePathElement) return -1;
    for (let i = 1; i < this.points.length; i++) {
      const screen = this.pointScreenPosition(i);
      if (screen && new Vector(mousePos).distance(screen) <= POINT_HIT_DISTANCE) {
        return i;
      }
    }
    return -1;
  }

  private drawClosingIndicator(): void {
    if (this.isClosing && this.activePathElement && this.points.length > 0) {
      const firstPoint = this.pointScreenPosition(0) ?? this.points[0];
      const ctx = this.context;
      if (!ctx || !firstPoint) return;

      drawPoint(ctx, firstPoint, 0, this.selectedPointIndex, "blue");
    }
  }

  public draw(): void {
    const mousePos = this.mousePos;
    const canvasPos = this.canvasPos;
    const penIcon = svgToCanvasPath(penIconSvg);
    const ctx = this.context;
    if (!ctx || !mousePos || !penIcon || !canvasPos) return;

    const isDragging = this.draggingPointIndex !== -1 && this.dragStarted;

    ctx.save();
    let translateX = 0;
    let translateY = 0;
    if (this.activePathElement) {
      const translation = this.toScreen(this.activePathElement.position);
      if (translation && this.workAreaOffset) {
        translateX = translation.x - this.workAreaOffset.x;
        translateY = translation.y - this.workAreaOffset.y;
        ctx.translate(translateX, translateY);
      }
    }

    // Draw points
    this.points.forEach((point, index) => {
      drawPoint(
        ctx,
        point,
        index,
        this.selectedPointIndex,
        undefined,
        this.hoveredPointIndex === index,
      );
    });

    // Dashed preview of the next segment (suspended while dragging)
    if (
      this.points.length > 0 &&
      !this.activePathElement?.isClosed &&
      !isDragging
    ) {
      const last = this.points[this.points.length - 1];
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = "gray";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      if (this.isClosing) {
        ctx.lineTo(this.points[0].x, this.points[0].y);
      } else {
        ctx.lineTo(mousePos.x - translateX, mousePos.y - translateY);
      }
      ctx.stroke();
    }
    ctx.restore();
    // Draw pen icon
    drawPen(ctx, mousePos, penIcon);

    this.drawClosingIndicator();
  }

  protected handleMouseDown(_evt: MouseEvent): void {
    if (!this.activePathElement) {
      this.eventBus.emit("edit:path", {
        position: this.canvasPos ?? { x: 0, y: 0 },
      });
      return;
    }

    if (
      this.isClosing &&
      !this.activePathElement.isClosed &&
      this.activePathElement.points.length >= 2
    ) {
      this.closePath();
      return;
    }

    const hit = this.hitTestPoint();
    if (hit !== -1) {
      this.selectedPointIndex = hit;
      this.draggingPointIndex = hit;
      this.mouseDownScreen = this.mousePos;
      this.dragStarted = false;
      this.updatePointsOverlay();
      return;
    }

    if (this.canvasPos) {
      this.activePathElement.addPoint(this.canvasPos);
      this.selectedPointIndex = this.activePathElement.points.length - 1;
      this.refreshTransformBox();
      this.updatePointsOverlay();
    }
  }

  protected handleMouseMove(): void {
    const mousePos = this.mousePos;
    if (!mousePos || !this.activePathElement) {
      this.isClosing = false;
      this.hoveredPointIndex = -1;
      return;
    }

    if (this.draggingPointIndex !== -1) {
      if (
        !this.dragStarted &&
        this.mouseDownScreen &&
        new Vector(mousePos).distance(this.mouseDownScreen) > POINT_DRAG_DISTANCE
      ) {
        this.dragStarted = true;
      }
      if (this.dragStarted && this.canvasPos) {
        this.isClosing = false;
        this.hoveredPointIndex = -1;
        this.activePathElement.updatePoint(
          this.draggingPointIndex,
          this.canvasPos,
        );
        this.refreshTransformBox();
        this.updatePointsOverlay();
      }
      return;
    }

    const firstPointWorld = this.activePathElement.toWorld(
      this.activePathElement.points[0],
    );
    const firstPointScreen = this.toScreen(firstPointWorld) ?? this.points[0];
    this.isClosing =
      new Vector(mousePos).distance(firstPointScreen as Position) <=
      CLOSING_DISTANCE;

    this.hoveredPointIndex = this.hitTestPoint();
  }

  protected handleMouseUp(): void {
    this.draggingPointIndex = -1;
    this.mouseDownScreen = null;
    this.dragStarted = false;
    this.updatePointsOverlay();
  }

  protected handleKeyDown(evt: KeyboardEvent): void {
    if (!this.activePathElement || this.selectedPointIndex < 0) return;

    if (evt.key === "Delete" || evt.key === "Backspace") {
      evt.preventDefault();
      if (this.activePathElement.points.length > 1) {
        this.activePathElement.removePoint(this.selectedPointIndex);
        this.selectedPointIndex = Math.min(
          this.selectedPointIndex,
          this.activePathElement.points.length - 1,
        );
        this.refreshTransformBox();
        this.updatePointsOverlay();
      }
      return;
    }

    const step = evt.shiftKey ? KEY_NUDGE_STEP_SHIFT : KEY_NUDGE_STEP;
    const deltas: Record<string, Position> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const delta = deltas[evt.key];
    if (delta) {
      evt.preventDefault();
      const world = this.activePathElement.toWorld(
        this.activePathElement.points[this.selectedPointIndex],
      );
      this.activePathElement.updatePoint(this.selectedPointIndex, {
        x: world.x + delta.x,
        y: world.y + delta.y,
      });
      this.refreshTransformBox();
      this.updatePointsOverlay();
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
  color?: string,
  hovered = false,
) {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.fillStyle = color ?? (index === selected ? "red" : "black");
  ctx.strokeStyle = "white";
  ctx.lineWidth = selected || hovered ? 3 : 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, hovered ? 3 : 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}
