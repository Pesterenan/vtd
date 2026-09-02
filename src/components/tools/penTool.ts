import { toRadians } from "src/utils/transforms";
import type { Point, Position } from "../types";
import { Tool } from "./abstractTool";
import type { EventBus } from "src/utils/eventBus";
import penIconSvg from "src/assets/icons/pen-tool.svg?raw";
import { svgToCanvasPath, ICON_SIZE } from "src/utils/icons";
import { PathElement } from "../elements/pathElement";
import { Vector } from "src/utils/vector";
import {
  closestPointOnSegment,
  hitTestSegments,
  constrainAxis as constrainAxisUtil,
} from "src/utils/pathMath";

const CLOSING_DISTANCE = 20;
const POINT_HIT_DISTANCE = 8;
const POINT_DRAG_DISTANCE = 5;
const KEY_NUDGE_STEP = 1;
const KEY_NUDGE_STEP_SHIFT = 10;

interface PathState {
  points: Point[];
  isClosed: boolean;
  position: Position;
}

export class PenTool extends Tool {
  /** Pontos em espaço de TELA — cache de `activePathElement.points` convertido via toWorld+toScreen. */
  private points: Position[] = [];
  private activePathElement: PathElement | null = null;
  private selectedPointIndex = -1;
  private hoveredPointIndex = -1;
  private draggingPointIndex = -1;
  private mouseDownScreen: Position | null = null;
  private dragStarted = false;
  private isClosing = false;
  private undoStack: PathState[] = [];
  private redoStack: PathState[] = [];
  private editingSnapshot: PathState | null = null;
  private dragOriginWorld: Position | null = null;
  private hintVisible = false;

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
    this.undoStack = [];
    this.redoStack = [];
    this.editingSnapshot = null;
    this.dragOriginWorld = null;
    this.setHint(false);
    this.eventBus.emit("workarea:update");
  }

  private selectActivePath = (): void => {
    const [selectedElements] = this.eventBus.request("workarea:selected:get");
    if (
      selectedElements?.length === 1 &&
      selectedElements[0] instanceof PathElement
    ) {
      if (this.activePathElement !== selectedElements[0]) {
        this.undoStack = [];
        this.redoStack = [];
        this.editingSnapshot = this.captureState(selectedElements[0]);
      }
      this.activePathElement = selectedElements[0];
      this.updatePointsOverlay();
      this.selectedPointIndex = this.points.length - 1;
      this.setHint(true);
    } else {
      this.resetTool();
    }
  };

  /**
   * Converte todos os pontos locais do path para espaço de tela.
   * Regra de ouro: SEMPRE `local -> world -> screen` (nunca local -> screen direto).
   */
  private updatePointsOverlay = (): void => {
    const active = this.activePathElement;
    if (!active) return;
    this.points = active.points
      .map((local) => {
        const world = active.toWorld(local);
        return this.toScreen(world);
      })
      .filter((p): p is Position => p !== null);
    this.eventBus.emit("workarea:update");
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

  private captureState(path: PathElement): PathState {
    return {
      points: path.points.map((p) => ({ ...p })),
      isClosed: path.isClosed,
      position: { ...path.position },
    };
  }

  private applyState(path: PathElement, state: PathState): void {
    path.points = state.points.map((p) => ({ ...p }));
    path.isClosed = state.isClosed;
    path.position = { ...state.position };
    path.recomputeBounds();
    this.refreshTransformBox();
    this.updatePointsOverlay();
  }

  private pushUndo(path: PathElement): void {
    this.undoStack.push(this.captureState(path));
    this.redoStack.length = 0;
  }

  private undo(): void {
    if (!this.activePathElement || this.undoStack.length === 0) return;
    this.redoStack.push(this.captureState(this.activePathElement));
    const state = this.undoStack.pop();
    if (state) this.applyState(this.activePathElement, state);
  }

  private redo(): void {
    if (!this.activePathElement || this.redoStack.length === 0) return;
    this.undoStack.push(this.captureState(this.activePathElement));
    const state = this.redoStack.pop();
    if (state) this.applyState(this.activePathElement, state);
  }

  private cancelEditing(): void {
    if (!this.activePathElement || !this.editingSnapshot) return;
    this.applyState(this.activePathElement, this.editingSnapshot);
    this.selectedPointIndex = -1;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  private closeWithKeyboard(): void {
    if (!this.activePathElement || this.activePathElement.isClosed) return;
    if (this.activePathElement.points.length < 3) {
      this.eventBus.emit("alert:add", {
        message: "É preciso pelo menos 3 pontos para fechar a forma.",
        type: "error",
      });
      return;
    }
    this.closePath();
  }

  private constrainAxis(position: Position, reference: Position): Position {
    return constrainAxisUtil(position, reference);
  }

  private setHint(visible: boolean): void {
    if (this.hintVisible === visible) return;
    this.hintVisible = visible;
    this.eventBus.emit("pen:hint", { visible });
  }

  private pointScreenPosition(index: number): Position | null {
    if (
      !this.activePathElement ||
      index === -1 ||
      index >= this.activePathElement.points.length
    )
      return null;
    return this.toScreen(
      this.activePathElement.toWorld(this.activePathElement.points[index]),
    );
  }

  /** Traz a posição do primeiro ponto em tela (reconvertendo a cada uso). */
  private firstPointScreen(): Position | null {
    if (!this.activePathElement) return null;
    return this.toScreen(
      this.activePathElement.toWorld(this.activePathElement.points[0]),
    );
  }

  /** Acha o vértice sob o cursor. O primeiro é reservado ao fechamento enquanto o path está aberto. */
  private hitTestPoint(): number {
    const mousePos = this.mousePos;
    if (!mousePos || !this.activePathElement) return -1;
    const start = this.activePathElement.isClosed ? 0 : 1;
    for (let i = start; i < this.points.length; i++) {
      const screen = this.pointScreenPosition(i);
      if (
        screen &&
        new Vector(mousePos).distance(screen) <= POINT_HIT_DISTANCE
      ) {
        return i;
      }
    }
    return -1;
  }

  private drawClosingIndicator(): void {
    if (this.isClosing && this.activePathElement && this.points.length > 0) {
      const firstPoint = this.firstPointScreen();
      const ctx = this.context;
      if (!ctx || !firstPoint) return;
      drawPoint(ctx, firstPoint, 0, this.selectedPointIndex, "blue");
    }
  }

  public draw(): void {
    const mousePos = this.mousePos;
    const ctx = this.context;
    const penIcon = svgToCanvasPath(penIconSvg);
    if (!ctx || !mousePos || !penIcon) return;

    const isDragging = this.draggingPointIndex !== -1 && this.dragStarted;

    // --- Ponto preditivo no meio do segmento (hover-inserção) ---
    // Só mostra se não está arrastando, não está fechando e não está sobre vértice.
    if (
      this.activePathElement &&
      !isDragging &&
      !this.isClosing &&
      this.hoveredPointIndex === -1
    ) {
      const hit = hitTestSegments(
        mousePos,
        this.points,
        !!this.activePathElement.isClosed,
        POINT_HIT_DISTANCE,
      );
      if (hit) {
        drawPoint(
          ctx,
          hit.projection,
          -1,
          this.selectedPointIndex,
          "orange",
          false,
        );
      }
    }

    // Vértices
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

    // Linha elástica (rubber band) — próximo segmento futuro
    if (
      this.points.length > 0 &&
      !this.activePathElement?.isClosed &&
      !isDragging
    ) {
      const last = this.points[this.points.length - 1];
      ctx.save();
      ctx.setLineDash(this.isClosing ? [] : [2, 2]);
      ctx.strokeStyle = this.isClosing ? "black" : "gray";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      if (this.isClosing) {
        ctx.lineTo(this.points[0].x, this.points[0].y);
      } else {
        ctx.lineTo(mousePos.x, mousePos.y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Ícone da caneta
    drawPen(ctx, mousePos, penIcon);
    this.drawClosingIndicator();
  }

  protected handleMouseDown(_evt: MouseEvent): void {
    const active = this.activePathElement;
    if (!active) {
      this.eventBus.emit("edit:path", {
        position: this.canvasPos ?? { x: 0, y: 0 },
      });
      return;
    }

    // 1. Fechamento por clique no primeiro ponto
    if (this.isClosing && !active.isClosed && active.points.length >= 2) {
      this.closePath();
      return;
    }

    // 2. Clique em vértice existente → seleciona / inicia arraste
    const hitVertex = this.hitTestPoint();
    if (hitVertex !== -1) {
      if (this.modifiers.alt) {
        if (active.isClosed) {
          active.isClosed = false;
        }
        active.removePoint(this.selectedPointIndex);
        this.refreshTransformBox();
        this.updatePointsOverlay();
        return;
      }
      this.selectedPointIndex = hitVertex;
      this.draggingPointIndex = hitVertex;
      this.mouseDownScreen = this.mousePos;
      this.dragStarted = false;
      this.updatePointsOverlay();
      return;
    }

    if (this.modifiers.shift)  {
      // 3. Clique no meio de um segmento → insere novo vértice na projeção
      if (this.mousePos && this.canvasPos) {
        const segHit = hitTestSegments(
          this.mousePos,
          this.points,
          active.isClosed,
          POINT_HIT_DISTANCE,
        );
        if (segHit) {
          const worldPoints = active.points.map((p) => active.toWorld(p));
          const segA = worldPoints[segHit.segmentIndex];
          const segB =
            worldPoints[(segHit.segmentIndex + 1) % worldPoints.length];
          const worldHit = closestPointOnSegment(this.canvasPos, segA, segB);

          this.pushUndo(active);
          active.addPoint(worldHit.q, segHit.segmentIndex + 1);
          this.selectedPointIndex = segHit.segmentIndex + 1;
          this.refreshTransformBox();
          this.updatePointsOverlay();
          return;
        }
      }
    }

    // 4. Fallback: adiciona ponto ao final (com constraint de Shift)
    if (this.canvasPos && !active.isClosed) {
      let target: Position = this.canvasPos;
      if (this.modifiers.shift) {
        const last = active.points[active.points.length - 1];
        target = this.constrainAxis(target, active.toWorld(last));
      }
      this.pushUndo(active);
      active.addPoint(target);
      this.selectedPointIndex = active.points.length - 1;
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

    if (this.modifiers.ctrl) {
      if (this.draggingPointIndex !== -1) {
        if (
          !this.dragStarted &&
          this.mouseDownScreen &&
          new Vector(mousePos).distance(this.mouseDownScreen) >
            POINT_DRAG_DISTANCE
        ) {
          this.dragStarted = true;
          this.pushUndo(this.activePathElement);
          this.dragOriginWorld = this.activePathElement.toWorld(
            this.activePathElement.points[this.draggingPointIndex],
          );
        }
        if (this.dragStarted && this.canvasPos) {
          this.isClosing = false;
          this.hoveredPointIndex = -1;
          let target: Position = this.canvasPos;
          if (this.modifiers.shift && this.dragOriginWorld) {
            target = this.constrainAxis(target, this.dragOriginWorld);
          }
          this.activePathElement.updatePoint(this.draggingPointIndex, target);
          this.refreshTransformBox();
          this.updatePointsOverlay();
        }
        return;
      }
    }

    const firstPointWorld = this.activePathElement.toWorld(
      this.activePathElement.points[0],
    );
    const firstPointScreen = this.toScreen(firstPointWorld) ?? this.points[0];
    this.isClosing =
      !this.activePathElement.isClosed &&
      new Vector(mousePos).distance(firstPointScreen as Position) <=
        CLOSING_DISTANCE;

    this.hoveredPointIndex = this.hitTestPoint();
  }

  protected handleMouseUp(): void {
    this.draggingPointIndex = -1;
    this.mouseDownScreen = null;
    this.dragStarted = false;
    this.dragOriginWorld = null;
    this.updatePointsOverlay();
  }

  protected handleKeyDown(evt: KeyboardEvent): void {
    if (!this.activePathElement) return;

    if (evt.key === "Escape") {
      evt.preventDefault();
      this.cancelEditing();
      return;
    }

    if (evt.key === "Enter") {
      evt.preventDefault();
      this.closeWithKeyboard();
      return;
    }

    if (this.modifiers.ctrl && evt.key.toLowerCase() === "z") {
      evt.preventDefault();
      if (this.modifiers.shift) {
        this.redo();
      } else {
        this.undo();
      }
      return;
    }

    if (this.modifiers.ctrl && evt.key.toLowerCase() === "y") {
      evt.preventDefault();
      this.redo();
      return;
    }

    if (this.selectedPointIndex < 0) return;

    if (evt.key === "Delete" || evt.key === "Backspace") {
      evt.preventDefault();
      if (this.activePathElement.points.length > 1) {
        this.pushUndo(this.activePathElement);
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

    const step = this.modifiers.shift ? KEY_NUDGE_STEP_SHIFT : KEY_NUDGE_STEP;
    const deltas: Record<string, Position> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const delta = deltas[evt.key];
    if (delta) {
      evt.preventDefault();
      this.pushUndo(this.activePathElement);
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

// Drawing helpers

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
