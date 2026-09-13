import type { Point, Position } from "../types";
import { Tool } from "./abstractTool";
import type { EventBus } from "src/utils/eventBus";
import penIconSvg from "src/assets/icons/pen-tool.svg?raw";
import { svgToCanvasPath, ICON_SIZE, drawCursorIcon } from "src/utils/icons";
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
  // Seleção/hover (persistem entre gestos, usados pelo overlay).
  private selectedPointIndex = -1;
  private hoveredPointIndex = -1;
  // Sessão de drag (transiente: vai de mouseDown até mouseUp).
  // selected persiste após o mouseUp, dragging reseta para -1 — por isso são campos separados.
  private draggingPointIndex = -1;
  private draggingPoint: "in" | "out" | null = null;
  // mouseDownScreen (TELA, para o threshold) x dragOriginWorld (MUNDO, para geometria):
  // espaços diferentes, ambos necessários.
  private mouseDownScreen: Position | null = null;
  private dragOriginWorld: Position | null = null;
  // Snapshot do Alt no mouseDown (o usuário pode soltar o Alt antes do mouseUp).
  private mouseDownWithAlt = false;
  private dragStarted = false;
  private isClosingPath = false;
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
    this.mouseDownWithAlt = false;
    this.dragStarted = false;
    this.isClosingPath = false;
    this.dragOriginWorld = null;
    this.setHint(false);
    this.eventBus.emit("workarea:update");
  }

  private selectActivePath = (): void => {
    const [elements] = this.eventBus.request("workarea:selected:get");
    if (elements?.length === 1 && elements[0] instanceof PathElement) {
      this.activePathElement = elements[0];
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

  /**
   * Único lugar que inicia uma sessão de drag (creation-drag ou grab).
   * Centraliza os 6 campos da sessão para evitar divergência entre os 3 call sites
   * do `handleMouseDown`. Também atualiza o overlay; o caller decide se precisa
   * de `refreshTransformBox` (só criação precisa já no mouseDown).
   */
  private beginDrag(
    index: number,
    which: "in" | "out" | null,
    mouseScreen: Position,
    originWorld: Position | null,
    started: boolean,
  ): void {
    this.selectedPointIndex = index;
    this.draggingPointIndex = index;
    this.draggingPoint = which;
    this.mouseDownScreen = mouseScreen;
    this.mouseDownWithAlt = this.modifiers.alt;
    this.dragStarted = started;
    this.dragOriginWorld = originWorld;
    this.updatePointsOverlay();
  }

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

  private setHint(visible: boolean): void {
    if (this.hintVisible === visible) return;
    this.hintVisible = visible;
    this.eventBus.emit("pen:hint", { visible });
  }

  /** Testa em qual handle do ponto foi o clique */
  private hitHandleOrPoint(
    mousePos: Position,
  ): { index: number; which: "in" | "center" | "out" } | null {
    if (!mousePos || this.points.length === 0) return null;
    const mouseVec = new Vector(mousePos);
    for (const [index, pt] of this.points.entries()) {
      if (pt.out !== null && mouseVec.distance(pt.out) <= POINT_HIT_DISTANCE) {
        return { index, which: "out" };
      }
      if (pt.in !== null && mouseVec.distance(pt.in) <= POINT_HIT_DISTANCE) {
        return { index, which: "in" };
      }
      if (mouseVec.distance(pt.center) <= POINT_HIT_DISTANCE) {
        return { index, which: "center" };
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
    drawCursorIcon(ctx, penIcon, mousePos, {
      offset: { x: -ICON_SIZE / 3 - 2, y: ICON_SIZE / 3 },
      rotationDeg: -45,
    });
  }

  protected handleMouseDown(_evt: MouseEvent): void {
    const active = this.activePathElement;
    // Tela: vem do ToolManager via `mouse:position:get`, que atualiza
    // lastMousePos no mousedown/mousemove/mouseup antes do delegate.
    const mousePos = this.mousePos;
    if (mousePos === null) return;
    // Se não existir path, tenta selecionar ou criar um novo ao clicar.
    if (!active) {
      this.eventBus.emit("edit:path", {
        position: this.canvasPos ?? { x: 0, y: 0 },
      });
      if (this.canvasPos && this.activePathElement) {
        const active = this.activePathElement;
        this.beginDrag(
          0,
          null,
          mousePos,
          active.toWorld(active.points[0]).center,
          false,
        );
        this.refreshTransformBox();
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
        // Agarrar um handle é intenção inequívoca de remodelar a curva:
        // o drag começa já no primeiro clique, sem limiar.
        const isHandle = hit.which !== "center";
        this.beginDrag(
          hit.index,
          hit.which === "center" ? null : hit.which,
          mousePos,
          isHandle ? active.toWorld(active.points[hit.index]).center : null,
          isHandle,
        );
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
      this.beginDrag(active.points.length - 1, null, mousePos, target, false);
      this.refreshTransformBox();
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
        // CTRL = move o centro (mesmo agarrando um handle);
        // ALT = move só o handle agarrado (centro fixo).
        // Sem modificador = smooth. Com ALT+CTRL, CTRL vence.
        if (this.draggingPoint) {
          // arrasta handle já existente
          if (this.modifiers.ctrl) {
            // CTRL: move o ponto central, handles acompanham.
            this.activePathElement.updatePoint(
              this.draggingPointIndex,
              target,
            );
          } else if (this.modifiers.alt) {
            // ALT: independente, move só o handle arrastado (centro fixo).
            this.activePathElement.updateHandle(
              this.draggingPointIndex,
              this.draggingPoint,
              target,
            );
          } else {
            // smooth: move handle arrastado e espelha oposto
            const pt = this.activePathElement.points[this.draggingPointIndex];
            const anchorWorld = this.activePathElement.toWorld(pt).center;
            const opp = mirrorPoint(anchorWorld, target);
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
        } else if (this.modifiers.ctrl) {
          // CTRL no anchor: move o ponto preservando os handles relativos.
          this.activePathElement.updatePoint(this.draggingPointIndex, target);
        } else {
          // sem modificador ou ALT: smooth - centro fixo, esculpe handles
          // simétricos (`out` segue o mouse). ALT cai aqui de propósito:
          // com ALT só os handles mexem, nunca o centro.
          // Exceção: primeiro ponto de um path novo (só tem 1 ponto) não tem
          // segmento de entrada, então só o `out` segue o mouse e o `in` fica null.
          const anchorWorld = this.dragOriginWorld!;
          const handleIn = mirrorPoint(anchorWorld, target);
          if (
            this.draggingPointIndex === 0 &&
            this.activePathElement.points.length === 1
          ) {
            this.activePathElement.setHandles(
              this.draggingPointIndex,
              null,
              target,
            );
          } else {
            this.activePathElement.setHandles(
              this.draggingPointIndex,
              handleIn,
              target,
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
      if (!this.activePathElement || this.activePathElement.isClosed) return;
      if (this.activePathElement.points.length < 3) {
        this.eventBus.emit("alert:add", {
          message: "É preciso pelo menos 3 pontos para fechar a forma.",
          type: "error",
        });
        return;
      }
      this.closePath();
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

// Drag helpers

/** Reflete `target` em torno de `anchor` (ponto simétrico, em mundo). */
function mirrorPoint(anchor: Position, target: Position): Position {
  return {
    x: anchor.x * 2 - target.x,
    y: anchor.y * 2 - target.y,
  };
}

// Drawing helpers

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
