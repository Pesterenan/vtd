import { toRadians } from "src/utils/transforms";
import type { Point, Position } from "../types";
import { Tool } from "./abstractTool";
import type { EventBus } from "src/utils/eventBus";
import penIconSvg from "src/assets/icons/pen-tool.svg?raw";
import { svgToCanvasPath, ICON_SIZE } from "src/utils/icons";
import { PathElement } from "../elements/pathElement";
import { Vector } from "src/utils/vector";
import {
  cubicBezierPoint,
  hitTestPathSegments,
  constrainAxis,
} from "src/utils/pathMath";

const CLOSING_DISTANCE = 20;
const POINT_HIT_DISTANCE = 8;
const POINT_DRAG_DISTANCE = 5;
const KEY_NUDGE_STEP = 1;
const KEY_NUDGE_STEP_SHIFT = 10;

export class PenTool extends Tool {
  /** Pontos em espaço de TELA — cache de `activePathElement.points` convertido via toWorld+toScreen. */
  private points: Point[] = [];
  private activePathElement: PathElement | null = null;
  private selectedPointIndex = -1;
  private hoveredPointIndex = -1;
  private draggingPointIndex = -1;
  private mouseDownScreen: Position | null = null;
  private mouseDownWithAlt = false;
  private dragStarted = false;
  private isClosingPath = false;
  private dragOriginWorld: Position | null = null;
  private hintVisible = false;
  private draggingPoint: "in" | "out" | null = null;

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
    this.mouseDownWithAlt = false;
    this.dragStarted = false;
    this.isClosingPath = false;
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
      this.activePathElement = selectedElements[0];
      this.updatePointsOverlay();
      this.selectedPointIndex = this.points.length - 1;
      this.setHint(true);
    } else {
      this.resetTool();
    }
  };

  /** Converte pontos do elemento para pontos mostrados na tela pela ferramenta
   * Pontos no path (locais) -> toWorld (canvas) -> toScreen (tela) */
  private updatePointsOverlay = (): void => {
    const active = this.activePathElement;
    if (!active) return;
    this.points = active.points.map((local) => {
      const world = active.toWorld(local);
      return {
        center: this.toScreen(world.center) ?? { ...world.center },
        in:
          world.in !== null
            ? (this.toScreen(world.in) ?? { ...world.in })
            : null,
        out:
          world.out !== null
            ? (this.toScreen(world.out) ?? { ...world.out })
            : null,
      };
    });
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

  private cancelEditing(): void {
    if (!this.activePathElement) return;
    this.selectedPointIndex = -1;
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

  private setHint(visible: boolean): void {
    if (this.hintVisible === visible) return;
    this.hintVisible = visible;
    this.eventBus.emit("pen:hint", { visible });
  }

  /**
   * Único ponto de entrada para hit-test em TELA.
   * Lê de `this.points` (cache screen em Point[]), testa handles antes do centro,
   * sem `else-if` (um ponto smooth tem in+out+center) e sem `return` dentro do loop.
   */
  private hitHandleOrPoint(
    mousePos: Position,
  ): { index: number; which: "in" | "center" | "out" } | null {
    if (!mousePos || this.points.length === 0) return null;
    const mouseVec = new Vector(mousePos);
    for (let i = 0; i < this.points.length; i++) {
      const pt = this.points[i];
      if (pt.in !== null && pt.in !== undefined) {
        if (mouseVec.distance(pt.in) <= POINT_HIT_DISTANCE) {
          return { index: i, which: "in" };
        }
      }
      if (pt.out !== null && pt.out !== undefined) {
        if (mouseVec.distance(pt.out) <= POINT_HIT_DISTANCE) {
          return { index: i, which: "out" };
        }
      }
      if (mouseVec.distance(pt.center) <= POINT_HIT_DISTANCE) {
        return { index: i, which: "center" };
      }
    }
    return null;
  }

  public draw(): void {
    const mousePos = this.mousePos;
    const ctx = this.context;
    const penIcon = svgToCanvasPath(penIconSvg);
    const active = this.activePathElement;
    if (!ctx || !mousePos || !penIcon) return;

    const isDragging = this.draggingPointIndex !== -1 && this.dragStarted;

    // --- Ponto preditivo no meio do segmento (hover-inserção) ---
    // Segue a curva de Bézier (igual ao render), não a reta entre centros.
    // Só mostra se não está arrastando, não está fechando e não está sobre vértice.
    if (
      active &&
      !isDragging &&
      !this.isClosingPath &&
      this.hoveredPointIndex === -1
    ) {
      const hit = hitTestPathSegments(
        mousePos,
        this.points,
        !!active.isClosed,
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

    // Linha elástica - próximo segmento futuro
    if (this.points.length > 0 && !active?.isClosed && !isDragging) {
      const first = this.points[0];
      const lastIndex = this.points.length - 1;
      const last = this.points[lastIndex];

      ctx.save();
      ctx.setLineDash(this.isClosingPath ? [] : [2, 2]);
      ctx.strokeStyle = this.isClosingPath ? "black" : "gray";
      ctx.beginPath();
      ctx.moveTo(last.center.x, last.center.y);
      if (active?.isBezier(lastIndex) && last.out) {
        const cp1 = last.out;
        const cp2 = first.in ?? first.center;
        ctx.bezierCurveTo(
          cp1.x,
          cp1.y,
          this.isClosingPath ? cp2.x : mousePos.x,
          this.isClosingPath ? cp2.y : mousePos.y,
          this.isClosingPath ? first.center.x : mousePos.x,
          this.isClosingPath ? first.center.y : mousePos.y,
        );
      } else {
        ctx.lineTo(
          this.isClosingPath ? first.center.x : mousePos.x,
          this.isClosingPath ? first.center.y : mousePos.y,
        );
      }
      ctx.stroke();
      ctx.restore();
    }

    // Handles dos pontos bézier
    for (let i = 0; i < this.points.length; i++) {
      if (!active?.isBezier(i)) continue;
      const point = this.points[i];
      const pointCenter = point.center;
      for (const which of ["in", "out"] as const) {
        const handle = point[which];
        if (!handle) continue;
        drawBezierHandle(ctx, pointCenter, handle);
      }
    }

    // Vértices
    this.points.forEach((point, index) => {
      drawPoint(
        ctx,
        point.center,
        index,
        this.selectedPointIndex,
        undefined,
        this.hoveredPointIndex === index,
      );
    });

    // Ícone da caneta
    drawPen(ctx, mousePos, penIcon);
  }

  protected handleMouseDown(evt: MouseEvent): void {
    const active = this.activePathElement;
    // Tela: prefere mousePos do eventBus, cai para offset do evento (testes sem mouse).
    const evtOffset = evt as MouseEvent & {
      offsetX?: number;
      offsetY?: number;
    };
    const mousePos =
      this.mousePos ??
      (typeof evtOffset.offsetX === "number" &&
      typeof evtOffset.offsetY === "number"
        ? { x: evtOffset.offsetX, y: evtOffset.offsetY }
        : null);
    if (mousePos === null) return;
    // Se não existir path, tenta selecionar ou criar um novo ao clicar.
    if (!active) {
      this.eventBus.emit("edit:path", {
        position: this.canvasPos ?? { x: 0, y: 0 },
      });
      if (this.canvasPos && this.activePathElement)    {
        const active = this.activePathElement;
        this.selectedPointIndex = 0;
        this.draggingPointIndex = this.selectedPointIndex;
        this.draggingPoint = null;
        this.mouseDownScreen = mousePos;
        this.mouseDownWithAlt = this.modifiers.alt;
        this.dragStarted = false;
        this.dragOriginWorld = active.toWorld(active.points[0]).center;
        this.refreshTransformBox();
        this.updatePointsOverlay();
      }
      return;
    }

    // 1. Fechamento por clique no primeiro ponto
    if (this.isClosingPath && !active.isClosed && active.points.length >= 2) {
      this.closePath();
      return;
    }

    // 2. Clique num ponto ou handle (único hit-test, em TELA).
    // O centro do índice 0 é reservado ao fechamento quando aberto:
    // handles do 0 continuam arrastáveis, mas o centro não seleciona/arrasta.
    const hit = this.hitHandleOrPoint(mousePos);
    if (hit) {
      if (!active.isClosed && hit.index === 0 && hit.which === "center") {
        // Cai para inserção/adição abaixo (ex.: path de 1 ponto vira 2).
      } else {
        this.selectedPointIndex = hit.index;
        this.draggingPointIndex = hit.index;
        this.draggingPoint = hit.which === "center" ? null : hit.which;
        this.mouseDownScreen = mousePos;
        this.mouseDownWithAlt = this.modifiers.alt;
        if (hit.which !== "center") {
          // Agarrar um handle é intenção inequívoca de remodelar a curva:
          // o drag começa já no primeiro clique, sem limiar.
          this.dragStarted = true;
          this.dragOriginWorld = active.toWorld(
            active.points[hit.index],
          ).center;
        } else {
          this.dragStarted = false;
        }
        this.updatePointsOverlay();
        return;
      }
    }

    if (this.modifiers.shift) {
      // 3. Clique no meio de um segmento → insere novo vértice na projeção.
      // Usa o mesmo hit da curva (tela) e avalia o mesmo `t` em mundo —
      // `t` é invariante a zoom/pan, então o ponto cai sobre a Bézier.
      if (this.mousePos && this.canvasPos) {
        const segHit = hitTestPathSegments(
          this.mousePos,
          this.points,
          active.isClosed,
          POINT_HIT_DISTANCE,
        );
        if (segHit) {
          const worldPoints = active.points.map((p) => active.toWorld(p));
          const n = worldPoints.length;
          const a = worldPoints[segHit.segmentIndex];
          const b = worldPoints[(segHit.segmentIndex + 1) % n];
          const worldHit = cubicBezierPoint(
            a.center,
            a.out ?? a.center,
            b.in ?? b.center,
            b.center,
            segHit.t,
          );

          active.addPoint(worldHit, segHit.segmentIndex + 1);
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
        target = constrainAxis(target, active.toWorld(last).center);
      }
      active.addPoint(target);
      this.selectedPointIndex = active.points.length - 1;
      this.draggingPointIndex = this.selectedPointIndex;
      this.draggingPoint = null;
      this.mouseDownScreen = mousePos;
      this.mouseDownWithAlt = this.modifiers.alt;
      this.dragStarted = false;
      this.dragOriginWorld = target;
      this.refreshTransformBox();
      this.updatePointsOverlay();
    }
  }

  protected handleMouseMove(): void {
    const mousePos = this.mousePos;
    if (!mousePos || !this.activePathElement) {
      this.isClosingPath = false;
      this.hoveredPointIndex = -1;
      return;
    }
    const firstPoint = this.points[0]?.center ?? null;

    if (this.draggingPointIndex !== -1) {
      if (
        !this.dragStarted &&
        this.mouseDownScreen &&
        new Vector(mousePos).distance(this.mouseDownScreen) >
          POINT_DRAG_DISTANCE
      ) {
        this.dragStarted = true;
        this.dragOriginWorld = this.activePathElement.toWorld(
          this.activePathElement.points[this.draggingPointIndex],
        ).center;
      }
      if (this.dragStarted && this.canvasPos) {
        this.isClosingPath = false;
        this.hoveredPointIndex = -1;
        let target: Position = this.canvasPos;
        if (this.modifiers.shift && this.dragOriginWorld) {
          target = constrainAxis(target, this.dragOriginWorld);
        }
        // Ctrl = mover anchor preservando handles; sem modificador = smooth;
        // Alt no anchor = reverter smooth -> corner; Alt no handle = independente.
        if (this.draggingPoint) {
          // arrasta handle já existente
          if (this.modifiers.alt) {
            // independente: move só o handle arrastado
            this.activePathElement.updateHandle(
              this.draggingPointIndex,
              this.draggingPoint,
              target,
            );
          } else if (this.modifiers.ctrl) {
            // Ctrl + handle: também independente (consistência)
            this.activePathElement.updateHandle(
              this.draggingPointIndex,
              this.draggingPoint,
              target,
            );
          } else {
            // smooth: move handle arrastado e espelha oposto
            const pt = this.activePathElement.points[this.draggingPointIndex];
            const anchorWorld = this.activePathElement.toWorld(pt).center;
            const v = {
              x: target.x - anchorWorld.x,
              y: target.y - anchorWorld.y,
            };
            const opp: Position = {
              x: anchorWorld.x - v.x,
              y: anchorWorld.y - v.y,
            };
            if (this.draggingPoint === "out") {
              this.activePathElement.setHandles(
                this.draggingPointIndex,
                opp,
                target,
              );
            } else {
              this.activePathElement.setHandles(
                this.draggingPointIndex,
                target,
                opp,
              );
            }
          }
        } else {
          // arrasta anchor
          if (this.modifiers.ctrl) {
            this.activePathElement.updatePoint(this.draggingPointIndex, target);
          } else if (this.modifiers.alt) {
            // Alt no anchor: reverte smooth -> corner e move o ponto.
            if (this.activePathElement.isBezier(this.draggingPointIndex)) {
              this.activePathElement.setHandles(
                this.draggingPointIndex,
                null,
                null,
              );
            }
            this.activePathElement.updatePoint(this.draggingPointIndex, target);
          } else {
            // sem modificador: smooth - transforma corner em curva simétrica
            const anchorWorld = this.dragOriginWorld!;
            const v = {
              x: target.x - anchorWorld.x,
              y: target.y - anchorWorld.y,
            };
            const handleOut: Position = {
              x: anchorWorld.x + v.x,
              y: anchorWorld.y + v.y,
            };
            const handleIn: Position = {
              x: anchorWorld.x - v.x,
              y: anchorWorld.y - v.y,
            };
            this.activePathElement.setHandles(
              this.draggingPointIndex,
              handleIn,
              handleOut,
            );
          }
        }
        this.refreshTransformBox();
        this.updatePointsOverlay();
      }
      return;
    }

    this.isClosingPath =
      !this.activePathElement.isClosed &&
      !!firstPoint &&
      new Vector(mousePos).distance(firstPoint) <= CLOSING_DISTANCE;

    // Hover usa o mesmo hit-test único. O índice 0 é reservado ao fechamento
    // enquanto o path está aberto (mostra indicador azul em vez de hover).
    const hoverHit = this.hitHandleOrPoint(mousePos);
    if (!hoverHit) {
      this.hoveredPointIndex = -1;
    } else if (
      !this.activePathElement.isClosed &&
      hoverHit.index === 0 &&
      hoverHit.which === "center"
    ) {
      this.hoveredPointIndex = -1;
    } else {
      this.hoveredPointIndex = hoverHit.index;
    }
  }

  protected handleMouseUp(): void {
    // Alt+click (sem arrastar) no anchor de um ponto smooth: reverte para corner.
    // O clique continua selecionando o ponto; só os handles são removidos.
    const wasClick = !this.dragStarted && this.draggingPointIndex !== -1;
    const hitAnchor = this.draggingPoint === null;
    const altHeld = this.modifiers.alt || this.mouseDownWithAlt;
    const active = this.activePathElement;
    const idx = this.draggingPointIndex;
    if (wasClick && hitAnchor && altHeld && active && active.isBezier(idx)) {
      active.setHandles(idx, null, null);
      this.refreshTransformBox();
    }
    this.draggingPointIndex = -1;
    this.draggingPoint = null;
    this.mouseDownScreen = null;
    this.mouseDownWithAlt = false;
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

    if (this.selectedPointIndex < 0) return;

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
      const world = this.activePathElement.toWorld(
        this.activePathElement.points[this.selectedPointIndex],
      ).center;
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
  mousePos: Position,
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
  position: Position,
  index: number,
  selected: number,
  color?: string,
  hovered = false,
) {
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.fillStyle = color ?? (index === selected ? "red" : "black");
  ctx.strokeStyle = "white";
  ctx.lineWidth = selected || hovered ? 3 : 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, hovered ? 3 : 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function drawBezierHandle(
  ctx: CanvasRenderingContext2D,
  pointCenter: Position,
  handle: Position,
) {
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1;
  ctx.setLineDash([1, 1]);
  ctx.beginPath();
  ctx.moveTo(pointCenter.x, pointCenter.y);
  ctx.lineTo(handle.x, handle.y);
  ctx.stroke();
  ctx.restore();
  drawPoint(ctx, handle, -1, -1, "gray", false);
}
