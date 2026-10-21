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
  traceSegment,
} from "src/utils/pathMath";

const CLOSING_DISTANCE = 20;
const POINT_HIT_DISTANCE = 8;
const POINT_DRAG_DISTANCE = 5;
const KEY_NUDGE_STEP = 1;
const KEY_NUDGE_STEP_SHIFT = 10;

const PEN_COLORS = {
  predictive: "orange",
  elasticOpen: "gray",
  elasticClosing: "black",
  selected: "red",
  vertex: "black",
  handle: "gray",
  outline: "white",
  handleLine: "lightgray",
  outlineBack: "white",
  outlineFront: "black",
} as const;

export const TOOL_HINT =
  "Enter: aceitar path, Esc: cancelar, Backspace: voltar, Shift: inserir vértice";

export class PenTool extends Tool {
  private static cachedPenIcon: Path2D | null = null;

  private static getPenIcon(): Path2D | null {
    if (!this.cachedPenIcon) {
      this.cachedPenIcon = svgToCanvasPath(penIconSvg);
    }
    return this.cachedPenIcon;
  }
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
  private isToolHintVisible = false;

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
  }

  private resetTool = (): void => {
    this.points = [];
    this.activePathElement = null;
    this.selectedPointIndex = -1;
    this.hoveredPointIndex = -1;
    this.draggingPointIndex = -1;
    this.draggingPoint = null;
    this.mouseDownScreen = null;
    this.mouseDownWithAlt = false;
    this.dragStarted = false;
    this.isClosingPath = false;
    this.dragOriginWorld = null;
    this.updateToolHint(false);
    this.eventBus.emit("workarea:update");
  };

  private selectActivePath = (): void => {
    const [elements] = this.eventBus.request("workarea:selected:get");
    if (elements?.length === 1 && elements[0] instanceof PathElement) {
      this.activePathElement = elements[0];
      this.updatePointsOverlay();
      // Path "somente selecionado": nenhum ponto selecionado. Clicar longe
      // das linhas cria um path novo; para continuar, clique no ponto final.
      this.selectedPointIndex = -1;
      this.updateToolHint(true);
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

  /** Emite os dois refreshes juntos (transformBox + overlay). */
  private syncOverlays(): void {
    this.refreshTransformBox();
    this.updatePointsOverlay();
  }

  /** Hit-test único do segmento sob o mouse (espaço de TELA). */
  private findSegmentUnderMouse(): ReturnType<typeof hitTestPathSegments> {
    const mousePos = this.mousePos;
    const active = this.activePathElement;
    if (!mousePos || !active) return null;
    return hitTestPathSegments(
      mousePos,
      this.points,
      !!active.isClosed,
      POINT_HIT_DISTANCE,
    );
  }

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

  private updateToolHint(visible: boolean): void {
    if (this.isToolHintVisible === visible) return;
    this.isToolHintVisible = visible;
    this.eventBus.emit("tool:hint", {
      hintText: this.isToolHintVisible ? TOOL_HINT : "",
    });
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

  /**
   * Contorno destacado do path ativo: halo branco de 1.5px
   * por baixo e linha preta de 1px por cima. Independe de cor/espessura do
   * elemento, então indica onde o path está mesmo sem stroke.
   * Desenha o segmento de fechamento quando o path é fechado.
   */
  private drawPathOutline(): void {
    const ctx = this.context;
    const active = this.activePathElement;
    if (!ctx || !active || this.points.length < 2) return;

    const lastIndex = this.points.length - 1;
    const drawPass = (style: SegmentStyle): void => {
      for (let i = 0; i < lastIndex; i++) {
        drawSegment(ctx, this.points[i], this.points[i + 1], style);
      }
      if (active.isClosed) {
        drawSegment(ctx, this.points[lastIndex], this.points[0], style);
      }
    };

    drawPass({ strokeStyle: PEN_COLORS.outlineBack, lineWidth: 1.5 });
    drawPass({ strokeStyle: PEN_COLORS.outlineFront, lineWidth: 1 });
  }

  public draw(): void {
    const mousePos = this.mousePos;
    const ctx = this.context;
    const penIcon = PenTool.getPenIcon();
    const active = this.activePathElement;

    // 1- Contorno do path (não depende do mouse estar sobre o canvas)
    this.drawPathOutline();

    if (!ctx || !mousePos || !penIcon) return;

    const isDragging = this.draggingPointIndex !== -1 && this.dragStarted;

    // 2- Ponto preditivo para adicionar vértice
    if (
      this.modifiers.shift &&
      active &&
      !isDragging &&
      !this.isClosingPath &&
      this.hoveredPointIndex === -1
    ) {
      const hit = this.findSegmentUnderMouse();
      if (hit) {
        drawPoint(
          ctx,
          hit.projection,
          -1,
          this.selectedPointIndex,
          PEN_COLORS.predictive,
          false,
        );
      }
    }

    // 3- Linha elástica até o fechamento, ou mouse
    if (this.isContinuingPath() && !isDragging) {
      const first = this.points[0];
      const lastIndex = this.points.length - 1;
      const last = this.points[lastIndex];
      const end = this.isClosingPath ? first.center : mousePos;
      // Endpoint virtual: ao fechar, o `in` do primeiro ponto participa da
      // curva; seguindo o mouse, não existe handle de entrada.
      const endPoint: Point = {
        center: end,
        in: this.isClosingPath ? first.in : null,
        out: null,
      };

      ctx.save();
      ctx.setLineDash(this.isClosingPath ? [] : [2, 2]);
      ctx.strokeStyle = this.isClosingPath
        ? PEN_COLORS.elasticClosing
        : PEN_COLORS.elasticOpen;
      ctx.beginPath();
      ctx.moveTo(last.center.x, last.center.y);
      traceSegment(ctx, last, endPoint);
      ctx.stroke();
      ctx.restore();
    }

    // 4- Handles dos pontos bézier
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

    // 5- Vértices
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

    // 6- Ícone da caneta
    drawCursorIcon(ctx, penIcon, mousePos, {
      offset: { x: -ICON_SIZE / 3 - 2, y: ICON_SIZE / 3 },
      rotationDeg: -45,
    });
  }

  protected handleMouseDown(evt: MouseEvent): void {
    // Só trata do botão esquerdo
    if (evt.button !== 0) return;
    const active = this.activePathElement;
    const mousePos = this.mousePos;
    const canvasPos = this.canvasPos;
    if (!mousePos || !canvasPos) return;

    // Se não tiver path ativo, cria um novo
    if (!active) {
      this.startNewPath(mousePos, false);
      return;
    }

    // CTRL + clique: seleciona o elemento sob o cursor ou deseleciona.
    if (this.modifiers.ctrl) {
      const hit = this.hitHandleOrPoint(mousePos);
      if (!hit) {
        this.eventBus.emit("workarea:selectAt", { firstPoint: canvasPos });
        return;
      }

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

    // Pode estar tentando fechar o path atual
    if (this.tryClosePath(active)) return;
    if (this.tryGrabHandle(active, mousePos)) return;

    // Fora do modo "continuar", clicar longe das linhas do path inicia um path
    // novo em vez de adicionar ponto ao path atual.
    if (!this.isContinuingPath() && this.isFarFromPath(mousePos)) {
      this.startNewPath(mousePos, true);
      return;
    }

    if (this.tryInsertAtSegment(active)) return;
    this.appendPoint(active, mousePos);
  }

  /**
   * Cria (ou seleciona) um path a partir de um clique no vazio.
   * Com `force`, cria um path novo mesmo que o clique caia dentro da bounding
   * box de um path existente.
   */
  private startNewPath(mouseScreen: Position, force: boolean): void {
    const previous = this.activePathElement;
    this.eventBus.emit(force ? "workarea:addPath" : "edit:path", {
      position: this.canvasPos ?? { x: 0, y: 0 },
    });
    const active = this.activePathElement;
    // Só inicia o drag se o path ativo realmente mudou (o workArea cria e
    // seleciona o novo path; sem ele, nada muda).
    if (!this.canvasPos || !active || active === previous) return;
    this.beginDrag(
      0,
      null,
      mouseScreen,
      active.toWorld(active.points[0]).center,
      false,
    );
    this.refreshTransformBox();
  }

  /** Verdadeiro se o clique está longe das linhas, pontos e handles do path ativo. */
  private isFarFromPath(mouseScreen: Position): boolean {
    return (
      this.hitHandleOrPoint(mouseScreen) === null &&
      this.findSegmentUnderMouse() === null
    );
  }

  /**
   * Modo "continuar": path aberto com o último ponto selecionado. É o estado em
   * que o rubber band aparece e os cliques adicionam pontos ao path.
   */
  private isContinuingPath(): boolean {
    const active = this.activePathElement;
    return (
      !!active &&
      !active.isClosed &&
      this.points.length > 0 &&
      this.selectedPointIndex === this.points.length - 1
    );
  }

  /** 1. Fechamento por clique no primeiro ponto. */
  private tryClosePath(active: PathElement): boolean {
    if (this.isClosingPath && !active.isClosed && active.points.length >= 2) {
      this.closePath();
      return true;
    }
    return false;
  }

  /**
   * 2. Clique num ponto ou handle (único hit-test, em TELA).
   * O centro do índice 0 é reservado ao fechamento quando aberto:
   * handles do 0 continuam arrastáveis, mas o centro não seleciona/arrasta.
   */
  private tryGrabHandle(active: PathElement, mousePos: Position): boolean {
    const hit = this.hitHandleOrPoint(mousePos);
    if (!hit) return false;
    if (!active.isClosed && hit.index === 0 && hit.which === "center") {
      // Cai para inserção/adição abaixo (ex.: path de 1 ponto vira 2).
      return false;
    }
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
    return true;
  }

  /**
   * 3. Clique no meio de um segmento → insere novo vértice na projeção.
   * Usa o mesmo hit da curva (tela) e avalia o mesmo `t` em mundo —
   * `t` é invariante a zoom/pan, então o ponto cai sobre a Bézier.
   */
  private tryInsertAtSegment(active: PathElement): boolean {
    if (!this.modifiers.shift) return false;
    if (!this.mousePos || !this.canvasPos) return false;
    const segHit = this.findSegmentUnderMouse();
    if (!segHit) return false;
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
    this.syncOverlays();
    return true;
  }

  /** 4. Fallback: adiciona ponto ao final (com constraint de Shift). */
  private appendPoint(active: PathElement, mouseScreen: Position): void {
    if (!this.canvasPos || active.isClosed) return;
    let target: Position = this.canvasPos;
    if (this.modifiers.shift) {
      const last = active.points[active.points.length - 1];
      target = constrainAxis(target, active.toWorld(last).center);
    }
    active.addPoint(target);
    this.beginDrag(active.points.length - 1, null, mouseScreen, target, false);
    this.refreshTransformBox();
  }

  protected handleMouseMove(): void {
    const mousePos = this.mousePos;
    if (!mousePos || !this.activePathElement) {
      this.isClosingPath = false;
      this.hoveredPointIndex = -1;
      return;
    }

    if (this.draggingPointIndex !== -1) {
      this.updateDragging(mousePos);
      return;
    }

    this.updateHoverAndClosing(mousePos);
  }

  private maybeStartDrag(mousePos: Position): void {
    if (
      this.dragStarted ||
      !this.mouseDownScreen ||
      this.draggingPointIndex === -1 ||
      !this.activePathElement
    ) {
      return;
    }
    if (
      new Vector(mousePos).distance(this.mouseDownScreen) > POINT_DRAG_DISTANCE
    ) {
      this.dragStarted = true;
      this.dragOriginWorld = this.activePathElement.toWorld(
        this.activePathElement.points[this.draggingPointIndex],
      ).center;
    }
  }

  private updateDragging(mousePos: Position): void {
    this.maybeStartDrag(mousePos);
    if (!this.dragStarted || !this.canvasPos || !this.activePathElement) return;
    this.isClosingPath = false;
    this.hoveredPointIndex = -1;
    let target: Position = this.canvasPos;
    if (this.modifiers.shift && this.dragOriginWorld) {
      target = constrainAxis(target, this.dragOriginWorld);
    }
    // CTRL no anchor = move o centro (handles relativos);
    // CTRL em handle = espelha o oposto (smooth), sem mover o centro.
    // ALT em handle = independente (centro fixo); com ALT+CTRL, ALT vence.
    if (this.draggingPoint) {
      this.dragExistingHandle(
        this.draggingPointIndex,
        this.draggingPoint,
        target,
      );
    } else {
      this.dragAnchorPoint(this.draggingPointIndex, target);
    }
    this.syncOverlays();
  }

  /** Arrasta handle já existente. */
  private dragExistingHandle(
    index: number,
    which: "in" | "out",
    target: Position,
  ): void {
    const active = this.activePathElement;
    if (!active) return;
    if (this.modifiers.alt) {
      // ALT: independente, move só o handle arrastado (centro fixo).
      active.updateHandle(index, which, target);
    } else {
      // smooth: move handle arrastado e espelha oposto
      const pt = active.points[index];
      const anchorWorld = active.toWorld(pt).center;
      const opp = mirrorPoint(anchorWorld, target);
      if (which === "out") {
        active.setHandles(index, opp, target);
      } else {
        active.setHandles(index, target, opp);
      }
    }
  }

  /** Arrasta o anchor (centro). CTRL move preservando handles; senão esculpe smooth. */
  private dragAnchorPoint(index: number, target: Position): void {
    const active = this.activePathElement;
    if (!active) return;
    if (this.modifiers.ctrl) {
      // CTRL no anchor: move o ponto preservando os handles relativos.
      active.updatePoint(index, target);
      return;
    }
    // sem modificador ou ALT: smooth - centro fixo, esculpe handles
    // simétricos (`out` segue o mouse). ALT cai aqui de propósito:
    // com ALT só os handles mexem, nunca o centro.
    // Exceção: primeiro ponto de um path novo (só tem 1 ponto) não tem
    // segmento de entrada, então só o `out` segue o mouse e o `in` fica null.
    const anchorWorld = this.dragOriginWorld;
    if (!anchorWorld) return;
    const handleIn = mirrorPoint(anchorWorld, target);
    if (index === 0 && active.points.length === 1) {
      active.setHandles(index, null, target);
    } else {
      active.setHandles(index, handleIn, target);
    }
  }

  private updateHoverAndClosing(mousePos: Position): void {
    const active = this.activePathElement;
    if (!active) return;
    const firstPoint = this.points[0]?.center ?? null;
    this.isClosingPath =
      !active.isClosed &&
      !!firstPoint &&
      new Vector(mousePos).distance(firstPoint) <= CLOSING_DISTANCE;

    // Hover usa o mesmo hit-test único. O índice 0 é reservado ao fechamento
    // enquanto o path está aberto (mostra indicador azul em vez de hover).
    const hoverHit = this.hitHandleOrPoint(mousePos);
    if (!hoverHit) {
      this.hoveredPointIndex = -1;
    } else if (
      !active.isClosed &&
      hoverHit.index === 0 &&
      hoverHit.which === "center"
    ) {
      this.hoveredPointIndex = -1;
    } else {
      this.hoveredPointIndex = hoverHit.index;
    }
  }

  protected handleMouseUp(evt: MouseEvent): void {
    // Ignora o botão direito: só o esquerdo encerra um arraste.
    if (evt.button !== 0) return;
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

  /**
   * Botão direito: descarta um path "em construção" (1 ponto) e deseleciona,
   * para o próximo clique iniciar um path novo.
   */
  protected handleContextMenu(evt: MouseEvent): void {
    evt.preventDefault();
    const active = this.activePathElement;
    if (active && active.points.length < 2) {
      this.eventBus.emit("workarea:deleteElement", {
        elementId: active.elementId,
      });
    }
    this.eventBus.emit("workarea:selectById", {
      elementsId: new Set<number>(),
    });
    this.resetTool();
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
        this.syncOverlays();
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
      this.syncOverlays();
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

type SegmentStyle = {
  strokeStyle: CanvasFillStrokeStyles["strokeStyle"];
  lineWidth: number;
};

/**
 * Desenha UM segmento `start → end` de um path nas coordenadas atuais
 * Delega a regra reta/curva ao `traceSegment`, então o
 * contorno coincide com o que o `PathElement` renderiza e com o que o
 * hit-test considera clicável.
 */
function drawSegment(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  style: SegmentStyle,
): void {
  ctx.save();
  ctx.strokeStyle = style.strokeStyle;
  ctx.lineWidth = style.lineWidth;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(start.center.x, start.center.y);
  traceSegment(ctx, start, end);
  ctx.stroke();
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
  ctx.fillStyle =
    color ?? (index === selected ? PEN_COLORS.selected : PEN_COLORS.vertex);
  ctx.strokeStyle = PEN_COLORS.outline;
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
  ctx.strokeStyle = PEN_COLORS.handleLine;
  ctx.lineWidth = 1;
  ctx.setLineDash([1, 1]);
  ctx.beginPath();
  ctx.moveTo(pointCenter.x, pointCenter.y);
  ctx.lineTo(handle.x, handle.y);
  ctx.stroke();
  ctx.restore();
  drawPoint(ctx, handle, -1, -1, PEN_COLORS.handle, false);
}
