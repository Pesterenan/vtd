import { PathElement } from "../elements/pathElement";
import { rotatePoint } from "src/utils/transforms";
import type { Element } from "../elements/element";
import type { Point, Position, TElementData } from "../types";
import { Tool } from "./abstractTool";

type PenState = "IDLE" | "DRAWING" | "EDIT_MOVING" | "EDIT_ADDING";

export class PenTool extends Tool {
  private state: PenState = "IDLE";
  private cursorPos: Position | null = null;
  private points: Point[] = [];
  private isClosing = false;
  private editElementId: number | null = null;
  private activePointIndex: number | null = null;
  private editPath: PathElement | null = null;
  private insertMode = false;
  private insertPointPos: Position | null = null;
  private insertTargetIndex: number | null = null;
  private insertPath: PathElement | null = null;
  private altHoverIndex: number | null = null;
  private altHoverPath: PathElement | null = null;
  private previewPath: PathElement | null = null;
  private previewIndex: number | null = null;
  private previewPos: Position | null = null;
  private readonly CLOSE_DISTANCE = 8;
  private readonly CLICK_DISTANCE = 8;

  public equip(): void {
    super.equip();
    if (this.canvas) this.canvas.style.cursor = "crosshair";
  }

public unequip(): void {
    const pointsBeforeDiscard = this.state === "DRAWING" && this.points.length >= 2;

    if (this.state === "DRAWING") {
      if (pointsBeforeDiscard) {
        this.finalizePath(false);
      } else {
        this.discardPath(true);
      }
    }

    // Sempre limpa todo o estado transitório para garantir que a troca de
    // ferramenta nunca deixe a PenTool em estado preso/inconsistente.
    this.state = "IDLE";
    this.editElementId = null;
    this.activePointIndex = null;
    this.editPath = null;
    this.insertMode = false;
    this.insertPointPos = null;
    this.insertTargetIndex = null;
    this.insertPath = null;
    this.altHoverIndex = null;
    this.altHoverPath = null;
    this.clearPreview();
    this.points = [];
    this.cursorPos = null;
    this.isClosing = false;

    if (this.canvas) this.canvas.style.cursor = "";
    super.unequip();
  }

  private discardPath(force = false) {
    if (this.state === "DRAWING" && this.points.length >= 2 && !force) {
      this.eventBus.emit("alert:add", {
        type: "success",
        message: "Caminho descartado",
      });
    }
    this.points = [];
    this.cursorPos = null;
    this.state = "IDLE";
    this.eventBus.emit("workarea:update");
  }

  private finalizePath(isClosed: boolean) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    this.points.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    const [center] = this.eventBus.request("workarea:adjustForCanvas", {
      position: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    });
    const points = this.points.map((p) => {
      const [pt] = this.eventBus.request("workarea:adjustForCanvas", {
        position: { x: p.x, y: p.y },
      });
      return pt;
    });
    this.points = [];
    this.cursorPos = null;
    this.state = "IDLE";
    this.isClosing = false;
    this.eventBus.emit("edit:path", { position: center, points, isClosed });
  }

  public draw(): void {
    this.context.save();

    if (this.points.length >= 1) {
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

    for (const { x, y } of this.points) {
      this.context.beginPath();
      this.context.arc(x, y, 3, 0, 2 * Math.PI);
      this.context.fillStyle = "#FFFFFF";
      this.context.fill();
      this.context.strokeStyle = "#000000";
      this.context.stroke();
    }

    if (this.isClosing && this.points.length > 0) {
      this.context.beginPath();
      this.context.strokeStyle = "#000000";
      this.context.fillStyle = "#0078D7";
      this.context.arc(this.points[0].x, this.points[0].y, 6, 0, 2 * Math.PI);
      this.context.fill();
      this.context.stroke();
    }

    if (this.insertMode && this.insertPath && this.insertPointPos && this.insertTargetIndex !== null) {
      this.drawInsertGhost(this.insertPath, this.insertTargetIndex, this.insertPointPos);
    } else if (
      this.previewPath &&
      this.previewPos &&
      this.previewIndex !== null
    ) {
      this.drawInsertGhost(this.previewPath, this.previewIndex, this.previewPos);
    }

    const editPath = this.editPath ?? this.getSelectedPath();
    if (this.state !== "DRAWING" && editPath) {
      this.drawEditHandles(editPath);
    }
    this.context.restore();
  }

  private drawInsertGhost(
    path: PathElement,
    index: number,
    pos: Position,
  ): void {
    const pair = this.segmentPair(path, index);
    if (!pair) return;

    const p1Canvas = pair.p1;
    const p2Canvas = pair.p2;

    const p1 = this.screen(p1Canvas);
    const p2 = this.screen(p2Canvas);
    const screenPos = this.screen(pos);

    // Mostra como ficará a nova polilinha: de p1 -> novo ponto -> p2.
    this.context.beginPath();
    this.context.moveTo(p1.x, p1.y);
    this.context.lineTo(screenPos.x, screenPos.y);
    this.context.moveTo(screenPos.x, screenPos.y);
    this.context.lineTo(p2.x, p2.y);
    this.context.strokeStyle = "#0078D7";
    this.context.lineWidth = 1;
    this.context.setLineDash([4, 4]);
    this.context.stroke();
    this.context.setLineDash([]);

    // Desenha ponto fantasma (maior que os pontos normais) na posição de inserção
    this.context.beginPath();
    this.context.arc(screenPos.x, screenPos.y, 6, 0, 2 * Math.PI);
    this.context.fillStyle = "#0078D7";
    this.context.fill();
    this.context.strokeStyle = "#FFFFFF";
    this.context.lineWidth = 1;
    this.context.stroke();

    // Desenha um "+" indicando ponto de inserção
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
    for (let i = 0; i < path.points.length; i++) {
      const canvasPos = this.localToCanvas(path, path.points[i]);
      const [screenPos] = this.eventBus.request("workarea:adjustForScreen", {
        position: canvasPos,
      });

      if (this.altHoverIndex === i) {
        // Preenchido em vermelho: ponto que será removido com ALT+click
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
        const canvasPos = this.localToCanvas(path, active);
        const [screenPos] = this.eventBus.request("workarea:adjustForScreen", {
          position: canvasPos,
        });
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
    if (
      selectedElements.length === 1 &&
      selectedElements[0] instanceof PathElement
    ) {
      return selectedElements[0];
    }
    return null;
  }

  private canvasToLocal(path: PathElement, canvasPos: Position): Position {
    const dx = canvasPos.x - path.position.x;
    const dy = canvasPos.y - path.position.y;
    const rotated = rotatePoint({ x: dx, y: dy }, { x: 0, y: 0 }, -path.rotation);
    const sx = path.scale.x || 1;
    const sy = path.scale.y || 1;
    return { x: rotated.x / sx, y: rotated.y / sy };
  }

  private localToCanvas(path: PathElement, local: Position): Position {
    const sx = path.scale.x || 1;
    const sy = path.scale.y || 1;
    const scaled = { x: local.x * sx, y: local.y * sy };
    const rotated = rotatePoint(scaled, { x: 0, y: 0 }, path.rotation);
    return { x: rotated.x + path.position.x, y: rotated.y + path.position.y };
  }

  private recomputeBounds(path: PathElement): void {
    if (path.points.length === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of path.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const localCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    const sx = path.scale.x || 1;
    const sy = path.scale.y || 1;
    const scaled = { x: localCenter.x * sx, y: localCenter.y * sy };
    const delta = rotatePoint(scaled, { x: 0, y: 0 }, path.rotation);
    path.position = {
      x: path.position.x + delta.x,
      y: path.position.y + delta.y,
    };
    path.points = path.points.map((p) => ({
      x: p.x - localCenter.x,
      y: p.y - localCenter.y,
    }));
    path.size = { width: maxX - minX, height: maxY - minY };
  }

  private findClosestPoint(
    path: PathElement,
    screenX: number,
    screenY: number,
  ): number | null {
    const [canvasPos] = this.eventBus.request("workarea:adjustForCanvas", {
      position: { x: screenX, y: screenY },
    });
    const [zoomLevel] = this.eventBus.request("zoomLevel:get");
    const threshold = this.CLICK_DISTANCE / (zoomLevel || 1);
    let closestIndex: number | null = null;
    let minDistance = Infinity;
    for (let i = 0; i < path.points.length; i++) {
      const canvasPoint = this.localToCanvas(path, path.points[i]);
      const dx = canvasPoint.x - canvasPos.x;
      const dy = canvasPoint.y - canvasPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    return minDistance <= threshold ? closestIndex : null;
  }

  private flattenElements(elements: Element<TElementData>[]): Element<TElementData>[] {
    const flat: Element<TElementData>[] = [];
    for (const el of elements) {
      flat.push(el);
      const group = el as { children?: Element<TElementData>[] };
      if (group.children) flat.push(...this.flattenElements(group.children));
    }
    return flat;
  }

  private findEditablePathAt(screenX: number, screenY: number): PathElement | null {
    const [elements] = this.eventBus.request("workarea:elements:get");
    const flat = elements?.length ? this.flattenElements(elements) : [];
    let found: PathElement | null = null;
    for (const el of flat) {
      if (el instanceof PathElement && el.isVisible && !el.isLocked) {
        if (this.isNearPointOrSegment(el, screenX, screenY)) {
          found = el;
        }
      }
    }
    if (!found) {
      const selected = this.getSelectedPath();
      if (selected && this.isNearPointOrSegment(selected, screenX, screenY)) {
        found = selected;
      }
    }
    return found;
  }

  private eraseTemporary(): void {
    this.insertMode = false;
    this.insertPointPos = null;
    this.insertTargetIndex = null;
    this.insertPath = null;
    this.activePointIndex = null;
    this.editElementId = null;
    this.editPath = null;
    this.altHoverIndex = null;
    this.altHoverPath = null;
    this.clearPreview();
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
    const p1 = this.localToCanvas(path, path.points[index]);
    const p2 = this.localToCanvas(
      path,
      path.isClosed ? path.points[(index + 1) % n] : path.points[index + 1],
    );
    return { p1, p2 };
  }

  private isNearPointOrSegment(path: PathElement, screenX: number, screenY: number): boolean {
    const [canvasPos] = this.eventBus.request("workarea:adjustForCanvas", {
      position: { x: screenX, y: screenY },
    });
    const [zoomLevel] = this.eventBus.request("zoomLevel:get");
    const threshold = this.CLICK_DISTANCE / (zoomLevel || 1);
    for (let i = 0; i < path.points.length; i++) {
      const p = this.localToCanvas(path, path.points[i]);
      if (Math.hypot(p.x - canvasPos.x, p.y - canvasPos.y) <= threshold) return true;
    }
    const segments = path.isClosed ? path.points.length : path.points.length - 1;
    for (let i = 0; i < segments; i++) {
      const pair = this.segmentPair(path, i);
      if (!pair) continue;
      if (
        this.pointToSegmentDistance(
          canvasPos.x,
          canvasPos.y,
          pair.p1.x,
          pair.p1.y,
          pair.p2.x,
          pair.p2.y,
        ) <= threshold
      ) {
        return true;
      }
    }
    return false;
  }

  private findNearestSegment(path: PathElement, screenX: number, screenY: number): { index: number } | null {
    const n = path.points.length;
    if (n < 2) return null;
    const [canvasPos] = this.eventBus.request("workarea:adjustForCanvas", {
      position: { x: screenX, y: screenY },
    });
    let bestIndex: number | null = null;
    let minDist = Infinity;
    const segments = path.isClosed ? n : n - 1;
    for (let i = 0; i < segments; i++) {
      const pair = this.segmentPair(path, i);
      if (!pair) continue;
      const d = this.pointToSegmentDistance(
        canvasPos.x,
        canvasPos.y,
        pair.p1.x,
        pair.p1.y,
        pair.p2.x,
        pair.p2.y,
      );
      if (d < minDist) {
        minDist = d;
        bestIndex = i;
      }
    }
    return bestIndex === null ? null : { index: bestIndex };
  }

  private beginInsert(path: PathElement, screenX: number, screenY: number): void {
    this.editElementId = path.elementId;
    this.insertMode = true;
    this.insertPath = path;
    const seg = this.findNearestSegment(path, screenX, screenY);
    if (!seg) {
      this.insertMode = false;
      this.insertPath = null;
      this.insertPointPos = null;
      this.insertTargetIndex = null;
      return;
    }
    this.insertTargetIndex = seg.index;
    const [clickCanvas] = this.eventBus.request("workarea:adjustForCanvas", {
      position: { x: screenX, y: screenY },
    });
    // Insere exatamente onde o mouse está, entre os dois pontos do segmento
    // mais próximo (a ordem do splice mantém o ponto entre eles).
    this.insertPointPos = clickCanvas;
    this.eventBus.emit("workarea:update");
  }

  private pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (dx === 0 && dy === 0) {
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    let tx = x1;
    let ty = y1;

    if (t > 0 && t < 1) {
      tx = x1 + t * dx;
      ty = y1 + t * dy;
    }

    return Math.sqrt((px - tx) ** 2 + (py - ty) ** 2);
  }

  private projectOnSegment(
    point: Position,
    p1: Position,
    p2: Position,
  ): Position {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    if (dx === 0 && dy === 0) return { ...point };
    const t =
      ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy);
    const clamped = Math.max(0, Math.min(1, t));
    return { x: p1.x + clamped * dx, y: p1.y + clamped * dy };
  }

  private removePoint(path: PathElement, index: number): void {
    if (path.points.length <= 1) return;
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
    this.eventBus.emit("workarea:update");
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
          this.state = "IDLE";
        }
      }
      return;
    }

    if (evt.code === "Escape") {
      this.activePointIndex = null;
      this.editElementId = null;
      this.editPath = null;
      this.insertMode = false;
      this.insertPointPos = null;
      this.insertTargetIndex = null;
      this.insertPath = null;
      this.altHoverIndex = null;
      this.altHoverPath = null;
      this.clearPreview();
      if (this.state === "EDIT_MOVING" || this.state === "EDIT_ADDING") {
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

      // Modificadores = edição/alteração de um caminho existente
      if (hasModifier) {
        if (evt.ctrlKey || evt.metaKey) {
          // CTRL: seleciona um path (ponto ou segmento) e arrasta os pontos
          const target = this.findEditablePathAt(evt.offsetX, evt.offsetY);
          if (target) {
            this.eraseTemporary();
            this.editPath = target;
            this.editElementId = target.elementId;
            const pointIndex = this.findClosestPoint(
              target,
              evt.offsetX,
              evt.offsetY,
            );
            if (pointIndex !== null) {
              this.activePointIndex = pointIndex;
              this.state = "EDIT_MOVING";
              this.recomputeBounds(target);
            }
            this.eventBus.emit("workarea:update");
          }
          return;
        }

        if (evt.shiftKey) {
          // SHIFT: insere um novo ponto entre os dois pontos mais próximos
          const target = this.findEditablePathAt(evt.offsetX, evt.offsetY);
          if (target) {
            this.eraseTemporary();
            this.beginInsert(target, evt.offsetX, evt.offsetY);
          }
          return;
        }

        if (evt.altKey) {
          // ALT: remove o ponto sob o mouse (destacado em vermelho)
          const target = this.findEditablePathAt(evt.offsetX, evt.offsetY);
          if (target) {
            const pointIndex = this.findClosestPoint(
              target,
              evt.offsetX,
              evt.offsetY,
            );
            if (pointIndex !== null) {
              this.editPath = target;
              this.editElementId = target.elementId;
              this.removePoint(target, pointIndex);
              this.altHoverIndex = null;
            }
            this.eventBus.emit("workarea:update");
          }
          return;
        }

        return;
      }

      // Clique simples: começa um novo path
      this.eraseTemporary();
      this.points.push({ x: evt.offsetX, y: evt.offsetY });
      this.state = "DRAWING";
      this.eventBus.emit("workarea:update");
    } else if (this.state === "DRAWING") {
      const dx = this.points[0].x - evt.offsetX;
      const dy = this.points[0].y - evt.offsetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.CLOSE_DISTANCE && this.points.length >= 2) {
        this.finalizePath(true);
      } else {
        this.points.push({ x: evt.offsetX, y: evt.offsetY });
        this.eventBus.emit("workarea:update");
      }
    }
  }

  public onMouseMove(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    this.cursorPos = { x: offsetX, y: offsetY };

    // Preview de remoção (ALT): destaca o ponto sob o mouse em vermelho
    if (evt.altKey) {
      const target = this.findEditablePathAt(offsetX, offsetY);
      const idx = target
        ? this.findClosestPoint(target, offsetX, offsetY)
        : null;
      if (idx !== this.altHoverIndex || target !== this.altHoverPath) {
        this.altHoverIndex = idx;
        this.altHoverPath = target;
        this.editPath = target;
        this.eventBus.emit("workarea:update");
      }
    } else if (this.altHoverIndex !== null || this.altHoverPath !== null) {
      this.altHoverIndex = null;
      this.altHoverPath = null;
      this.editPath = null;
      this.eventBus.emit("workarea:update");
    }

    if (this.state === "EDIT_MOVING" && this.activePointIndex !== null) {
      const path = this.editPath ?? this.getSelectedPath();
      if (path && path.elementId === this.editElementId) {
        const point = path.points[this.activePointIndex];
        if (point) {
          const [canvasPos] = this.eventBus.request(
            "workarea:adjustForCanvas",
            { position: { x: offsetX, y: offsetY } },
          );
          const local = this.canvasToLocal(path, canvasPos);
          point.x = local.x;
          point.y = local.y;
          this.eventBus.emit("workarea:update");
        }
      }
      return;
    }

    // Durante um insert já ativo (SHIFT pressionado e clique), segue o cursor.
    if (this.insertMode && this.insertPath) {
      const [moveCanvas] = this.eventBus.request(
        "workarea:adjustForCanvas",
        { position: { x: offsetX, y: offsetY } },
      );
      const seg = this.findNearestSegment(this.insertPath, offsetX, offsetY);
      if (seg) {
        this.insertTargetIndex = seg.index;
        this.insertPointPos = moveCanvas;
        this.eventBus.emit("workarea:update");
      }
    } else if (evt.shiftKey && this.state === "IDLE") {
      // Preview de inserção: aparece assim que o SHIFT é segurado e o mouse
      // passa sobre um path (sem precisar clicar).
      const target = this.findEditablePathAt(offsetX, offsetY);
      if (target) {
        const seg = this.findNearestSegment(target, offsetX, offsetY);
        const [moveCanvas] = this.eventBus.request(
          "workarea:adjustForCanvas",
          { position: { x: offsetX, y: offsetY } },
        );
        if (seg) {
          this.previewPath = target;
          this.previewIndex = seg.index;
          this.previewPos = moveCanvas;
        } else {
          this.clearPreview();
        }
      } else {
        this.clearPreview();
      }
      this.eventBus.emit("workarea:update");
    } else if (this.previewPath) {
      this.clearPreview();
      this.eventBus.emit("workarea:update");
    }

    if (this.state === "DRAWING") {
      const dx = this.points[0].x - offsetX;
      const dy = this.points[0].y - offsetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.isClosing = dist <= this.CLOSE_DISTANCE && this.points.length >= 2;
      this.eventBus.emit("workarea:update");
    }
  }

  private clearPreview(): void {
    this.previewPath = null;
    this.previewIndex = null;
    this.previewPos = null;
  }

  public onMouseUp(_evt: MouseEvent): void {
    if (this.insertMode) {
      const path = this.insertPath ?? this.getSelectedPath();
      if (path && this.insertPointPos && this.insertTargetIndex !== null) {
        const localPos = this.canvasToLocal(path, this.insertPointPos);
        path.points.splice(this.insertTargetIndex + 1, 0, localPos);
        this.recomputeBounds(path);
        this.refreshTransformBox(path);
      }
      this.state = "IDLE";
      this.insertMode = false;
      this.insertPointPos = null;
      this.insertTargetIndex = null;
      this.insertPath = null;
      this.clearPreview();
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

  private refreshTransformBox(path: PathElement): void {
    this.eventBus.emit("workarea:selectById", {
      elementsId: new Set([path.elementId]),
    });
  }
}
