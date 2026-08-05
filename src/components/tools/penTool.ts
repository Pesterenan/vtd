import { PathElement } from "../elements/pathElement";
import { toRadians } from "src/utils/transforms";
import type { Element } from "../elements/element";
import type { Point, Position, TElementData } from "../types";
import { Tool } from "./abstractTool";

type PenState = "IDLE" | "DRAWING" | "EDIT_MOVING" | "EDIT_ADDING";

type ExtendSide = "start" | "end";

/** Transformação (escala + rotação + translação) pré-calculada de um path. */
interface PathTransform {
  cos: number;
  sin: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

/** Ponto (ou segmento) de um path sob o cursor, com o índice do ponto (se houver). */
interface CanvasHit {
  path: PathElement;
  pointIndex: number | null;
}

/**
 * Estado transitório de uma única interação pendente de edição no cursor.
 * Substitui os diversos flags booleanos paralelos (insertMode, extendMode,
 * previewPath, altHover...) por uma união discriminada, deixando explícito
 * qual interação está ativa de cada vez.
 */
type Ghost =
  | { kind: "insert"; path: PathElement; index: number; pos: Position }
  | {
      kind: "extend";
      path: PathElement;
      side: ExtendSide;
      pos: Position;
      closing: boolean;
    }
  | { kind: "remove"; path: PathElement; index: number }
  | null;

export class PenTool extends Tool {
  // Estado de desenho de um novo path.
  private state: PenState = "IDLE";
  private cursorPos: Position | null = null;
  private points: Point[] = [];
  private isClosing = false;

  // Estado de edição de um path existente.
  private editElementId: number | null = null;
  private activePointIndex: number | null = null;
  private editPath: PathElement | null = null;
  private ghost: Ghost = null;

  private readonly CLOSE_DISTANCE = 8;
  private readonly CLICK_DISTANCE = 8;

  public equip(): void {
    super.equip();
    if (this.canvas) this.canvas.style.cursor = "crosshair";
  }

  public unequip(): void {
    if (this.state === "DRAWING") {
      // Garante limpeza do estado mesmo se finalizePath falhar.
      try {
        if (this.points.length >= 2) {
          this.finalizePath(false);
        } else {
          this.discardPath(true);
        }
      } catch {
        // Continua a limpeza abaixo mesmo em caso de erro.
      }
    }
    this.resetEditState();
    this.resetDrawing();
    this.state = "IDLE";
    if (this.canvas) this.canvas.style.cursor = "";
    super.unequip();
  }

  private discardPath(force = false): void {
    if (this.state === "DRAWING" && this.points.length >= 2 && !force) {
      this.eventBus.emit("alert:add", {
        type: "success",
        message: "Caminho descartado",
      });
    }
    this.resetDrawing();
    this.state = "IDLE";
    this.eventBus.emit("workarea:update");
  }

  private boundsOf(points: Point[]) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }

  private finalizePath(isClosed: boolean): void {
    const bounds = this.boundsOf(this.points);
    // Validação: se não houver pontos válidos após calcular bounds, aborta.
    if (bounds.minX === Infinity || bounds.minY === Infinity) return;

    const [center] = this.eventBus.request("workarea:adjustForCanvas", {
      position: {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      },
    });
    // Validação de retorno do eventBus antes de usar o resultado.
    if (!center || center.x === undefined || center.y === undefined) return;

    const points = this.points.map((p) => {
      const [pt] = this.eventBus.request("workarea:adjustForCanvas", {
        position: { x: p.x, y: p.y },
      });
      // Validação de retorno do eventBus para cada ponto.
      if (!pt || pt.x === undefined || pt.y === undefined) return p;
      return pt;
    });

    this.eventBus.emit("edit:path", { position: center, points, isClosed });
    this.resetDrawing();
    this.state = "IDLE";
    this.eventBus.emit("workarea:update");
  }

  public draw(): void {
    this.context.save();
    this.drawDraft();
    this.drawDraftPoints();

    if (this.isClosing && this.points.length > 0) {
      this.context.beginPath();
      this.context.strokeStyle = "#000000";
      this.context.fillStyle = "#0078D7";
      this.context.arc(this.points[0].x, this.points[0].y, 6, 0, 2 * Math.PI);
      this.context.fill();
      this.context.stroke();
    }

    const ghost = this.ghost;
    if (ghost?.kind === "extend") {
      this.drawExtendGhost(ghost);
    } else if (ghost?.kind === "insert") {
      this.drawInsertGhost(ghost);
    }

    const editPath = this.editPath ?? this.getSelectedPath();
    if (this.state !== "DRAWING" && editPath) {
      this.drawEditHandles(editPath);
    }
    this.context.restore();
  }

  private drawDraft(): void {
    if (this.points.length < 1) return;
    this.context.beginPath();
    this.context.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      this.context.lineTo(this.points[i].x, this.points[i].y);
    }
    if (this.cursorPos) {
      const lastPt = this.points[this.points.length - 1];
      this.context.moveTo(lastPt.x, lastPt.y);
      this.context.globalAlpha = 0.5;
      this.context.setLineDash([5, 5]);
      this.context.lineTo(this.cursorPos.x, this.cursorPos.y);
    }
    this.context.strokeStyle = "#202020";
    this.context.lineWidth = 2;
    this.context.stroke();
    this.context.setLineDash([]);
    this.context.globalAlpha = 1;
  }

  private drawDraftPoints(): void {
    for (const { x, y } of this.points) {
      this.context.beginPath();
      this.context.arc(x, y, 3, 0, 2 * Math.PI);
      this.context.fillStyle = "#FFFFFF";
      this.context.fill();
      this.context.strokeStyle = "#000000";
      this.context.stroke();
    }
  }

  private drawInsertGhost(
    ghost: Extract<Ghost, { kind: "insert" }>,
  ): void {
    const pair = this.segmentPair(ghost.path, ghost.index);
    if (!pair) return;

    const p1 = this.screen(pair.p1);
    const p2 = this.screen(pair.p2);
    const screenPos = this.screen(ghost.pos);

    // Mostra como ficará a nova polilinha: de p1 -> novo ponto -> p2.
    this.strokeGhostLine([p1, screenPos, p2], "#0078D7");
    this.drawGhostMarker(screenPos, "#0078D7");
  }

  private drawExtendGhost(
    ghost: Extract<Ghost, { kind: "extend" }>,
  ): void {
    const { path, side, pos, closing } = ghost;
    const activeIndex =
      this.activePointIndex ?? (side === "start" ? 0 : path.points.length - 1);
    const t = this.pathTransform(path);
    const p1 = this.screen(this.localToCanvas(path.points[activeIndex], t));

    let targetPos = pos;
    let color = "#0078D7";
    if (closing) {
      // Ao fechar, o preview gruda no extremo oposto e muda de cor.
      const oppositeIndex = side === "start" ? path.points.length - 1 : 0;
      targetPos = this.localToCanvas(path.points[oppositeIndex], t);
      color = "#107C10";
    }
    const screenPos = this.screen(targetPos);

    this.strokeGhostLine([p1, screenPos], color);
    this.drawGhostMarker(screenPos, color);
  }

  private strokeGhostLine(points: Position[], color: string): void {
    this.context.beginPath();
    this.context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.context.lineTo(points[i].x, points[i].y);
    }
    this.context.strokeStyle = color;
    this.context.lineWidth = 1;
    this.context.setLineDash([4, 4]);
    this.context.stroke();
    this.context.setLineDash([]);
  }

  private drawGhostMarker(screenPos: Position, color: string): void {
    // Ponto fantasma na posição de inserção/fechamento.
    this.context.beginPath();
    this.context.arc(screenPos.x, screenPos.y, 6, 0, 2 * Math.PI);
    this.context.fillStyle = color;
    this.context.fill();
    this.context.strokeStyle = "#FFFFFF";
    this.context.lineWidth = 1;
    this.context.stroke();

    // Desenha um "+" indicando ponto de inserção/fechamento.
    const crossSize = 12;
    this.context.beginPath();
    this.context.moveTo(screenPos.x - crossSize / 2, screenPos.y);
    this.context.lineTo(screenPos.x + crossSize / 2, screenPos.y);
    this.context.moveTo(screenPos.x, screenPos.y - crossSize / 2);
    this.context.lineTo(screenPos.x, screenPos.y + crossSize / 2);
    this.context.strokeStyle = "#FFFFFF";
    this.context.lineWidth = 1;
    this.context.stroke();
  }

  private screen(canvasPos: Position): Position {
    const [screenPos] = this.eventBus.request("workarea:adjustForScreen", {
      position: canvasPos,
    });
    return screenPos;
  }

  private drawEditHandles(path: PathElement): void {
    const removeTarget = this.ghost?.kind === "remove" ? this.ghost.index : null;
    const t = this.pathTransform(path);
    for (let i = 0; i < path.points.length; i++) {
      const screenPos = this.screen(this.localToCanvas(path.points[i], t));

      if (removeTarget === i) {
        // Preenchido em vermelho: ponto que será removido com ALT+click.
        this.context.beginPath();
        this.context.arc(screenPos.x, screenPos.y, 6, 0, 2 * Math.PI);
        this.context.fillStyle = "#E81123";
        this.context.fill();
        this.context.strokeStyle = "#FFFFFF";
        this.context.stroke();
        continue;
      }

      this.context.beginPath();
      this.context.arc(screenPos.x, screenPos.y, 3, 0, 2 * Math.PI);
      this.context.fillStyle = "#FFFFFF";
      this.context.fill();
      this.context.strokeStyle = "#000000";
      this.context.stroke();
    }

    if (this.activePointIndex !== null) {
      const active = path.points[this.activePointIndex];
      if (active) {
        const screenPos = this.screen(this.localToCanvas(active, t));
        this.context.beginPath();
        this.context.arc(screenPos.x, screenPos.y, 6, 0, 2 * Math.PI);
        this.context.fillStyle = "#0078D7";
        this.context.fill();
        this.context.strokeStyle = "#000000";
        this.context.stroke();
      }
    }
  }

  private getSelectedPath(): PathElement | null {
    const [selectedElements] = this.eventBus.request("workarea:selected:get");

    // Deve ser um array com exatamente 1 elemento do tipo PathElement.
    if (!Array.isArray(selectedElements) || selectedElements.length !== 1) {
      return null;
    }
    const element = selectedElements[0];
    return element instanceof PathElement ? element : null;
  }

  // Se o ponto ativo for o primeiro ou último de um path aberto, retorna o
  // path e o lado (início/fim) para extensão. Caso contrário, retorna null.
  private getExtensionTarget(): {
    path: PathElement;
    side: ExtendSide;
  } | null {
    if (this.activePointIndex === null) return null;
    const path = this.editPath ?? this.getSelectedPath();
    if (!path || path.isClosed) return null;
    const n = path.points.length;
    if (n < 1) return null;
    if (this.activePointIndex === 0) return { path, side: "start" };
    if (this.activePointIndex === n - 1) return { path, side: "end" };
    return null;
  }

  // ===== Transformações de coordenadas =====

  private pathTransform(path: PathElement): PathTransform {
    const radians = toRadians(path.rotation);
    return {
      cos: Math.cos(radians),
      sin: Math.sin(radians),
      sx: path.scale.x || 1,
      sy: path.scale.y || 1,
      tx: path.position.x,
      ty: path.position.y,
    };
  }

  private localToCanvas(local: Position, t: PathTransform): Position {
    const x = local.x * t.sx;
    const y = local.y * t.sy;
    return {
      x: x * t.cos - y * t.sin + t.tx,
      y: x * t.sin + y * t.cos + t.ty,
    };
  }

  private canvasToLocal(canvasPos: Position, t: PathTransform): Position {
    const dx = canvasPos.x - t.tx;
    const dy = canvasPos.y - t.ty;
    return {
      x: (dx * t.cos + dy * t.sin) / t.sx,
      y: (-dx * t.sin + dy * t.cos) / t.sy,
    };
  }

  private toCanvas(screenX: number, screenY: number): Position {
    const [canvasPos] = this.eventBus.request("workarea:adjustForCanvas", {
      position: { x: screenX, y: screenY },
    });
    return canvasPos;
  }

  private clickThreshold(): number {
    const [zoomLevel] = this.eventBus.request("zoomLevel:get");
    return this.CLICK_DISTANCE / (zoomLevel || 1);
  }

  // ===== Busca por pontos/segmentos =====

  private findNearestPoint(
    path: PathElement,
    canvasPos: Position,
    threshold: number,
  ): number | null {
    const t = this.pathTransform(path);
    let bestIndex: number | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < path.points.length; i++) {
      const p = this.localToCanvas(path.points[i], t);
      const dist =
        (p.x - canvasPos.x) ** 2 + (p.y - canvasPos.y) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }
    return bestIndex !== null && bestDist <= threshold * threshold
      ? bestIndex
      : null;
  }

  private hitTest(
    path: PathElement,
    canvasPos: Position,
    threshold: number,
    t: PathTransform,
  ): CanvasHit | null {
    const pointIndex = this.findNearestPoint(path, canvasPos, threshold);
    if (pointIndex !== null) return { path, pointIndex };
    if (this.nearSegment(path, canvasPos, threshold, t)) {
      return { path, pointIndex: null };
    }
    return null;
  }

  private flattenElements(
    elements: Element<TElementData>[],
  ): Element<TElementData>[] {
    const flat: Element<TElementData>[] = [];
    for (const el of elements) {
      flat.push(el);
      const group = el as { children?: Element<TElementData>[] };
      if (group.children) flat.push(...this.flattenElements(group.children));
    }
    return flat;
  }

  private findEditablePathAt(
    canvasPos: Position,
    threshold: number,
  ): CanvasHit | null {
    const [elements] = this.eventBus.request("workarea:elements:get");
    const flat = elements?.length ? this.flattenElements(elements) : [];
    let found: CanvasHit | null = null;
    for (const el of flat) {
      if (el instanceof PathElement && el.isVisible && !el.isLocked) {
        const t = this.pathTransform(el);
        const hit = this.hitTest(el, canvasPos, threshold, t);
        if (hit) found = hit;
      }
    }
    if (!found) {
      const selected = this.getSelectedPath();
      if (selected) {
        const t = this.pathTransform(selected);
        const hit = this.hitTest(selected, canvasPos, threshold, t);
        if (hit) found = hit;
      }
    }
    return found;
  }

  // Retorna se o canvasPos está a menos de `threshold` de algum segmento do path.
  private nearSegment(
    path: PathElement,
    canvasPos: Position,
    threshold: number,
    t: PathTransform,
  ): boolean {
    const n = path.points.length;
    const segments = path.isClosed ? n : n - 1;
    for (let i = 0; i < segments; i++) {
      const p1 = this.localToCanvas(path.points[i], t);
      const p2 = this.localToCanvas(
        path.isClosed ? path.points[(i + 1) % n] : path.points[i + 1],
        t,
      );
      if (
        this.pointToSegmentDistanceSq(canvasPos, p1, p2) <=
        threshold * threshold
      ) {
        return true;
      }
    }
    return false;
  }

  private findNearestSegment(
    path: PathElement,
    canvasPos: Position,
  ): { index: number } | null {
    const n = path.points.length;
    if (n < 2) return null;
    const t = this.pathTransform(path);
    let bestIndex: number | null = null;
    let minDist = Infinity;
    const segments = path.isClosed ? n : n - 1;
    for (let i = 0; i < segments; i++) {
      const p1 = this.localToCanvas(path.points[i], t);
      const p2 = this.localToCanvas(
        path.isClosed ? path.points[(i + 1) % n] : path.points[i + 1],
        t,
      );
      const dist = this.pointToSegmentDistanceSq(canvasPos, p1, p2);
      if (dist < minDist) {
        minDist = dist;
        bestIndex = i;
      }
    }
    return bestIndex === null ? null : { index: bestIndex };
  }

  // Distância (ao quadrado) entre um ponto e um segmento.
  private pointToSegmentDistanceSq(
    p: Position,
    a: Position,
    b: Position,
  ): number {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    if (lenSq === 0) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
    const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
    const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
    const tx = a.x + clamped * abx;
    const ty = a.y + clamped * aby;
    return (p.x - tx) ** 2 + (p.y - ty) ** 2;
  }

  // Retorna o par de pontos (no espaço canvas) do segmento `index`. Para um
  // path fechado o último segmento fecha de volta ao primeiro ponto.
  private segmentPair(
    path: PathElement,
    index: number,
  ): { p1: Position; p2: Position } | null {
    const n = path.points.length;
    if (n < 2 || index < 0) return null;
    const maxIndex = path.isClosed ? n : n - 1;
    if (index >= maxIndex) return null;
    const t = this.pathTransform(path);
    const p1 = this.localToCanvas(path.points[index], t);
    const p2 = this.localToCanvas(
      path.isClosed ? path.points[(index + 1) % n] : path.points[index + 1],
      t,
    );
    return { p1, p2 };
  }

  private beginInsert(path: PathElement, canvasPos: Position): void {
    const seg = this.findNearestSegment(path, canvasPos);
    if (!seg) return;
    this.editElementId = path.elementId;
    this.editPath = path;
    this.state = "EDIT_ADDING";
    this.ghost = { kind: "insert", path, index: seg.index, pos: canvasPos };
    this.eventBus.emit("workarea:update");
  }

  private removePoint(path: PathElement, index: number): void {
    // Um path precisa de ao menos 2 pontos para ser desenhável; não remove o
    // penúltimo ponto (impede deixar o path com só 1 ponto).
    if (path.points.length <= 2) return;
    path.points.splice(index, 1);
    if (this.activePointIndex !== null) {
      if (this.activePointIndex === index) {
        this.activePointIndex = null;
        this.editElementId = null;
      } else if (this.activePointIndex > index) {
        this.activePointIndex--;
      }
    }
    this.recomputeBounds(path);
    this.refreshTransformBox(path);
    this.eventBus.emit("workarea:update");
  }

  private recomputeBounds(path: PathElement): void {
    if (path.points.length === 0) return;
    const bounds = this.boundsOf(path.points);
    const localCenter = {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    };
    const t = this.pathTransform(path);
    const scaled = { x: localCenter.x * t.sx, y: localCenter.y * t.sy };
    const delta = {
      x: scaled.x * t.cos - scaled.y * t.sin,
      y: scaled.x * t.sin + scaled.y * t.cos,
    };
    path.position = {
      x: path.position.x + delta.x,
      y: path.position.y + delta.y,
    };
    path.points = path.points.map((p) => ({
      x: p.x - localCenter.x,
      y: p.y - localCenter.y,
    }));
    path.size = { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
  }

  public onKeyDown(evt: KeyboardEvent): void {
    if (this.state === "DRAWING") {
      if (evt.code === "Enter" && this.points.length >= 2) {
        this.finalizePath(false);
      }
      if (evt.code === "Escape") {
        this.discardPath();
      }
      if (evt.code === "Backspace") {
        this.points.pop();
        if (this.points.length === 0) {
          this.discardPath(true);
        } else {
          this.eventBus.emit("workarea:update");
        }
      }
      return;
    }

    if (evt.code === "Escape") {
      const wasEditing =
        this.state === "EDIT_MOVING" || this.state === "EDIT_ADDING";
      this.resetEditState();
      if (wasEditing) {
        const path = this.getSelectedPath();
        if (path) this.recomputeBounds(path);
        this.state = "IDLE";
      }
      this.eventBus.emit("workarea:update");
    } else if (
      (evt.code === "Backspace" || evt.code === "Delete") &&
      this.activePointIndex !== null
    ) {
      const path = this.getSelectedPath();
      if (path && path.elementId === this.editElementId) {
        this.removePoint(path, this.activePointIndex);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyUp(_evt: KeyboardEvent): void {}

  public onMouseDown(evt: MouseEvent): void {
    if (evt.button !== 0) return;

    if (this.state === "IDLE") {
      const hasModifier =
        evt.ctrlKey || evt.metaKey || evt.shiftKey || evt.altKey;

      // Modificadores = edição/alteração de um caminho existente.
      if (hasModifier) {
        const canvasPos = this.toCanvas(evt.offsetX, evt.offsetY);
        const threshold = this.clickThreshold();

        if (evt.ctrlKey || evt.metaKey) {
          // CTRL: seleciona um path (ponto ou segmento) e arrasta os pontos.
          const hit = this.findEditablePathAt(canvasPos, threshold);
          if (hit) {
            this.resetEditState();
            this.editPath = hit.path;
            this.editElementId = hit.path.elementId;
            if (hit.pointIndex !== null) {
              this.activePointIndex = hit.pointIndex;
              this.state = "EDIT_MOVING";
              this.recomputeBounds(hit.path);
            }
            this.eventBus.emit("workarea:update");
          }
          return;
        }

        if (evt.shiftKey) {
          this.handleShiftClick(evt, canvasPos, threshold);
          return;
        }

        if (evt.altKey) {
          // ALT: remove o ponto sob o mouse (destacado em vermelho).
          const hit = this.findEditablePathAt(canvasPos, threshold);
          if (hit && hit.pointIndex !== null) {
            this.editPath = hit.path;
            this.editElementId = hit.path.elementId;
            this.removePoint(hit.path, hit.pointIndex);
            this.ghost = null;
            this.eventBus.emit("workarea:update");
          }
          return;
        }

        return;
      }

      // Clique simples: começa um novo path.
      this.resetEditState();
      this.points.push({ x: evt.offsetX, y: evt.offsetY });
      this.state = "DRAWING";
      this.eventBus.emit("workarea:update");
    } else if (this.state === "DRAWING") {
      const dx = this.points[0].x - evt.offsetX;
      const dy = this.points[0].y - evt.offsetY;
      if (
        Math.sqrt(dx * dx + dy * dy) <= this.CLOSE_DISTANCE &&
        this.points.length >= 2
      ) {
        this.finalizePath(true);
      } else {
        this.points.push({ x: evt.offsetX, y: evt.offsetY });
        this.eventBus.emit("workarea:update");
      }
    }
  }

  /**
   * SHIFT+click: se o primeiro/último ponto de um path aberto estiver
   * selecionado, estende o caminho a partir dele (e fecha ao clicar no
   * extremo oposto). Caso contrário, insere um ponto num segmento.
   */
  private handleShiftClick(
    evt: MouseEvent,
    canvasPos: Position,
    threshold: number,
  ): void {
    const ext = this.getExtensionTarget();
    if (ext) {
      const oppositeIndex =
        ext.side === "start" ? ext.path.points.length - 1 : 0;
      const closePoint = this.findNearestPoint(
        ext.path,
        canvasPos,
        threshold,
      );

      // Clique no extremo oposto: fecha o caminho em vez de estender.
      if (closePoint !== null && closePoint === oppositeIndex) {
        ext.path.isClosed = true;
        this.resetEditState();
        this.recomputeBounds(ext.path);
        this.refreshTransformBox(ext.path);
        this.eventBus.emit("workarea:update");
        return;
      }

      const localPos = this.canvasToLocal(
        canvasPos,
        this.pathTransform(ext.path),
      );
      const insertIndex =
        ext.side === "start" ? 0 : ext.path.points.length;
      ext.path.points.splice(insertIndex, 0, localPos);
      this.activePointIndex =
        ext.side === "start" ? 0 : ext.path.points.length - 1;
      this.editPath = ext.path;
      this.editElementId = ext.path.elementId;
      this.recomputeBounds(ext.path);
      this.refreshTransformBox(ext.path);
      this.eventBus.emit("workarea:update");
      return;
    }

    const hit = this.findEditablePathAt(canvasPos, threshold);
    if (hit) {
      this.resetEditState();
      this.beginInsert(hit.path, canvasPos);
    }
  }

  public onMouseMove(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    this.cursorPos = { x: offsetX, y: offsetY };
    const canvasPos = this.toCanvas(offsetX, offsetY);
    const threshold = this.clickThreshold();

    this.updateRemoveHover(evt, canvasPos, threshold);

    if (this.state === "EDIT_MOVING" && this.activePointIndex !== null) {
      const path = this.editPath ?? this.getSelectedPath();
      if (path && path.elementId === this.editElementId) {
        const point = path.points[this.activePointIndex];
        if (point) {
          const local = this.canvasToLocal(canvasPos, this.pathTransform(path));
          point.x = local.x;
          point.y = local.y;
          this.eventBus.emit("workarea:update");
        }
      }
      return;
    }

    this.updateMovePreview(evt, canvasPos, threshold);

    if (this.state === "DRAWING") {
      const dx = this.points[0].x - offsetX;
      const dy = this.points[0].y - offsetY;
      this.isClosing =
        Math.sqrt(dx * dx + dy * dy) <= this.CLOSE_DISTANCE &&
        this.points.length >= 2;
    }
    this.eventBus.emit("workarea:update");
  }

  // Preview de remoção (ALT): destaca o ponto sob o mouse em vermelho.
  private updateRemoveHover(
    evt: MouseEvent,
    canvasPos: Position,
    threshold: number,
  ): void {
    if (evt.altKey) {
      const hit = this.findEditablePathAt(canvasPos, threshold);
      const path = hit?.path ?? null;
      const index = hit?.pointIndex ?? null;
      const current = this.ghost?.kind === "remove" ? this.ghost : null;
      const changed =
        index !== (current?.index ?? null) || path !== (current?.path ?? null);
      if (changed) {
        this.ghost =
          path && index !== null
            ? { kind: "remove", path, index }
            : null;
        this.editPath = path;
      }
    } else if (this.ghost?.kind === "remove") {
      this.ghost = null;
      this.editPath = null;
    }
  }

  private updateMovePreview(
    evt: MouseEvent,
    canvasPos: Position,
    threshold: number,
  ): void {
    // Durante um insert já ativo (SHIFT pressionado e clique), segue o cursor.
    if (this.state === "EDIT_ADDING" && this.ghost?.kind === "insert") {
      const seg = this.findNearestSegment(this.ghost.path, canvasPos);
      if (seg) {
        this.ghost = {
          kind: "insert",
          path: this.ghost.path,
          index: seg.index,
          pos: canvasPos,
        };
      }
      return;
    }

    if (evt.shiftKey && this.state === "IDLE") {
      // Preview de extensão: com o primeiro/último ponto selecionado, mostra a
      // linha do ponto até o mouse. Senão, preview de inserção em segmento.
      const ext = this.getExtensionTarget();
      if (ext) {
        const oppositeIndex =
          ext.side === "start" ? ext.path.points.length - 1 : 0;
        const closePoint = this.findNearestPoint(
          ext.path,
          canvasPos,
          threshold,
        );
        this.ghost = {
          kind: "extend",
          path: ext.path,
          side: ext.side,
          pos: canvasPos,
          closing: closePoint !== null && closePoint === oppositeIndex,
        };
        return;
      }

      this.ghost = null;
      const hit = this.findEditablePathAt(canvasPos, threshold);
      if (hit) {
        const seg = this.findNearestSegment(hit.path, canvasPos);
        if (seg) {
          this.ghost = {
            kind: "insert",
            path: hit.path,
            index: seg.index,
            pos: canvasPos,
          };
        }
      }
      return;
    }

    this.ghost = null;
  }

  public onMouseUp(_evt: MouseEvent): void {
    if (this.state === "EDIT_ADDING") {
      const ghost = this.ghost;
      if (ghost?.kind === "insert") {
        const localPos = this.canvasToLocal(
          ghost.pos,
          this.pathTransform(ghost.path),
        );
        ghost.path.points.splice(ghost.index + 1, 0, localPos);
        this.recomputeBounds(ghost.path);
        this.refreshTransformBox(ghost.path);
      }
      this.state = "IDLE";
      this.resetEditState();
      this.eventBus.emit("workarea:update");
      return;
    }

    if (this.state === "EDIT_MOVING") {
      this.state = "IDLE";
      const path = this.editPath ?? this.getSelectedPath();
      if (path && path.elementId === this.editElementId) {
        this.recomputeBounds(path);
        this.refreshTransformBox(path);
      }
      this.eventBus.emit("workarea:update");
    }
  }

  // ===== Limpeza de estado =====

  // Limpa o estado transitório de edição de um path existente (ghost + alvo).
  private resetEditState(): void {
    this.editElementId = null;
    this.activePointIndex = null;
    this.editPath = null;
    this.ghost = null;
  }

  // Limpa o estado de desenho de um novo path em andamento.
  private resetDrawing(): void {
    this.points = [];
    this.cursorPos = null;
    this.isClosing = false;
  }

  private refreshTransformBox(path: PathElement): void {
    this.eventBus.emit("workarea:selectById", {
      elementsId: new Set([path.elementId]),
    });
  }
}