import type { ContextMenuItem, EventBus } from "src/utils/eventBus";
import { Tool } from "./abstractTool";
import type { ShapeMode } from "./shapeGeometry";
import { buildShapePoints, resolveShapeBox } from "./shapeGeometry";
import { Vector } from "src/utils/vector";
import type { Point, Position } from "../types";

const MODE_OPTIONS: { mode: ShapeMode; label: string }[] = [
  { mode: "rectangle", label: "Retângulo" },
  { mode: "ellipse", label: "Elipse" },
  { mode: "triangle", label: "Triângulo" },
  { mode: "polygon", label: "Polígono" },
  { mode: "star", label: "Estrela" },
];

const SIDES_LIMITS: Record<ShapeMode, { min: number; max: number } | null> = {
  rectangle: null,
  ellipse: null,
  triangle: null,
  polygon: { min: 5, max: 12 },
  star: { min: 4, max: 8 },
};

export class ShapeTool extends Tool {
  private currentMode: ShapeMode = "rectangle";
  private sides = 5;
  private startPoint: Position | null;
  private currentPoint: Position | null;
  private isDragging = false;
  private toolHint: { isVisible: boolean; hintText?: string } = {
    isVisible: false,
    hintText: "",
  };

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    super(canvas, eventBus);
  }

  public equip(): void {
    super.equip();
    this.canvas.style.cursor = "crosshair";
    this.toolHint.isVisible = true;
    this.updateToolHint();
  }
  public unequip(): void {
    super.unequip();
    this.canvas.style.cursor = "";
    this.startPoint = null;
    this.currentPoint = null;
    this.isDragging = false;
    this.toolHint.isVisible = false;
    this.eventBus.emit("tool:hint", { hintText: "" });
    this.eventBus.emit("workarea:update");
  }

  private reset(): void {
    this.currentPoint = null;
    this.isDragging = false;
    this.startPoint = null;
    this.eventBus.emit("workarea:update");
  }

  private getHintText(): string {
    const limits = SIDES_LIMITS[this.currentMode];
    const sidesSuffix = limits ? ` - Lados: ${this.sides}` : "";
    return `[CMD]: Criar - [CME]: Escolher forma | Forma: ${this.currentMode}${sidesSuffix}`;
  }
  private clampSides(): void {
    const limits = SIDES_LIMITS[this.currentMode];
    if (!limits) return;
    this.sides = Math.min(limits.max, Math.max(limits.min, this.sides));
  }

  public draw(): void {
    const ctx = this.context;
    if (!ctx || !this.isDragging || !this.startPoint || !this.currentPoint)
      return;
    ctx.save();
    const first = this.toScreen(this.startPoint);
    const last = this.toScreen(this.currentPoint);
    if (!first || !last) return;
    const shapeBox = resolveShapeBox(first, last, {
      fromCenter: this.modifiers.alt,
      square: this.modifiers.shift,
      mode: this.currentMode,
    });
    const points = buildShapePoints(this.currentMode, shapeBox, this.sides);
    if (points.length > 0) drawPreviewShape(ctx, points);
    ctx.restore();
  }

  protected handleMouseDown(): void {
    if (!this.isDragging) {
      this.startPoint = this.canvasPos;
    }
  }

  protected handleMouseMove(evt: MouseEvent): void {
    if (!this.startPoint || !this.canvasPos) return;
    const canvasPos = new Vector(this.canvasPos);
    if (!this.isDragging) {
      const distance = new Vector(this.startPoint).distance(canvasPos);
      this.isDragging = distance > ShapeTool.DRAGGING_DISTANCE;
    }
    if (this.isDragging) {
      if (this.modifiers.ctrl) {
        const offset = new Vector({ x: evt.movementX, y: evt.movementY });
        this.startPoint = new Vector(this.startPoint).add(offset);
      }
      this.currentPoint = this.canvasPos;
    }
    this.eventBus.emit("workarea:update");
  }

  protected handleMouseUp(): void {
    if (this.isDragging && this.startPoint && this.currentPoint) {
      const shapeBox = resolveShapeBox(this.startPoint, this.currentPoint, {
        fromCenter: this.modifiers.alt,
        square: this.modifiers.shift,
        mode: this.currentMode,
      });
      this.eventBus.emit("edit:shape", {
        mode: this.currentMode,
        box: shapeBox,
        sides: this.sides,
      });
      this.reset();
    }
  }

  protected handleKeyDown(evt: KeyboardEvent): void {
    evt.preventDefault();
    if (evt.key === "Escape") {
      this.reset();
      return;
    }
  }

  private updateToolHint(): void {
    if (!this.toolHint.isVisible) return;
    this.eventBus.emit("tool:hint", { hintText: this.getHintText() });
  }

  protected handleWheel(evt: WheelEvent): void {
    const limits = SIDES_LIMITS[this.currentMode];
    if (!limits) return;
    const delta = evt.deltaY < 0 ? 1 : evt.deltaY > 0 ? -1 : 0;
    if (delta === 0) return;
    this.sides = Math.min(limits.max, Math.max(limits.min, this.sides + delta));
    this.updateToolHint();
  }

  protected handleContextMenu(evt: MouseEvent): void {
    evt.preventDefault();
    const items: ContextMenuItem[] = MODE_OPTIONS.map(({ mode, label }) => ({
      type: "item",
      id: mode,
      label,
      active: mode === this.currentMode,
      action: () => {
        this.currentMode = mode;
        this.clampSides();
        this.reset();
        this.updateToolHint();
      },
    }));

    this.eventBus.emit("workarea:contextMenu:open", {
      position: { x: evt.clientX, y: evt.clientY },
      items,
    });
  }
}

function drawPreviewShape(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length === 0) return;
  ctx.save();
  ctx.strokeStyle = "gray";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(points[0].center.x, points[0].center.y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1],
      cur = points[i];
    if (prev.out || cur.in) {
      const cp1 = prev.out ?? prev.center;
      const cp2 = cur.in ?? cur.center;
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, cur.center.x, cur.center.y);
    } else {
      ctx.lineTo(cur.center.x, cur.center.y);
    }
  }
  const last = points[points.length - 1];
  const first = points[0];
  if (last.out || first.in) {
    const cp1 = last.out ?? last.center;
    const cp2 = first.in ?? first.center;
    ctx.bezierCurveTo(
      cp1.x,
      cp1.y,
      cp2.x,
      cp2.y,
      first.center.x,
      first.center.y,
    );
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
