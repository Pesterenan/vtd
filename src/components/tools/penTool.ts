import { PathElement } from "../elements/pathElement";
import { rotatePoint } from "src/utils/transforms";
import type { Point, Position } from "../types";
import { Tool } from "./abstractTool";

type PenState = "IDLE" | "DRAWING" | "EDIT_MOVING" | "EDIT_ADDING";

export class PenTool extends Tool {
  private state: PenState = "IDLE";
  private cursorPos: Position | null = null;
  private points: Point[] = [];
  private isClosing = false;
  private editElementId: number | null = null;
  private activePointIndex: number | null = null;
  private readonly CLOSE_DISTANCE = 8;
  private readonly CLICK_DISTANCE = 8;

  public equip(): void {
    super.equip();
    if (this.canvas) this.canvas.style.cursor = "crosshair";
  }

  public unequip(): void {
    this.editElementId = null;
    this.activePointIndex = null;
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

    if (this.editElementId !== null || this.activePointIndex !== null) {
      this.drawEditHandles();
    }
    this.context.restore();
  }

  private drawEditHandles(): void {
    const path = this.getSelectedPath();
    if (!path || path.elementId !== this.editElementId) return;

    for (const { x, y } of path.points) {
      const canvasPos = this.localToCanvas(path, { x, y });
      const [screenPos] = this.eventBus.request("workarea:adjustForScreen", {
        position: canvasPos,
      });
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

    if (this.state === "EDIT_ADDING" && this.cursorPos && path.points.length > 0) {
      const lastPoint = path.points[path.points.length - 1];
      const canvasPos = this.localToCanvas(path, lastPoint);
      const [screenPos] = this.eventBus.request("workarea:adjustForScreen", {
        position: canvasPos,
      });
      this.context.beginPath();
      this.context.globalAlpha = 0.5;
      this.context.setLineDash([5, 5]);
      this.context.moveTo(screenPos.x, screenPos.y);
      this.context.lineTo(this.cursorPos.x, this.cursorPos.y);
      this.context.strokeStyle = "#202020";
      this.context.lineWidth = 2;
      this.context.stroke();
      this.context.setLineDash([]);
      this.context.globalAlpha = 1;
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
      const path = hasModifier ? this.getSelectedPath() : null;

      if (path) {
        if (evt.ctrlKey || evt.metaKey) {
          const pointIndex = this.findClosestPoint(
            path,
            evt.offsetX,
            evt.offsetY,
          );
          if (pointIndex !== null) {
            this.editElementId = path.elementId;
            this.activePointIndex = pointIndex;
            this.state = "EDIT_MOVING";
            this.recomputeBounds(path);
            this.eventBus.emit("workarea:update");
            return;
          }
        } else if (evt.shiftKey) {
          this.editElementId = path.elementId;
          this.cursorPos = { x: evt.offsetX, y: evt.offsetY };
          this.state = "EDIT_ADDING";
          this.eventBus.emit("workarea:update");
          return;
        } else if (evt.altKey) {
          const pointIndex = this.findClosestPoint(
            path,
            evt.offsetX,
            evt.offsetY,
          );
          if (pointIndex !== null) {
            this.removePoint(path, pointIndex);
            return;
          }
        }
      }

      this.activePointIndex = null;
      this.editElementId = null;
      this.points.push({ x: evt.offsetX, y: evt.offsetY });
      this.state = "DRAWING";
    } else if (this.state === "DRAWING") {
      const dx = this.points[0].x - evt.offsetX;
      const dy = this.points[0].y - evt.offsetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.CLOSE_DISTANCE && this.points.length >= 2) {
        this.finalizePath(true);
      } else {
        this.points.push({ x: evt.offsetX, y: evt.offsetY });
      }
    }
  }

  public onMouseMove(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    this.cursorPos = { x: offsetX, y: offsetY };

    if (this.state === "EDIT_MOVING" && this.activePointIndex !== null) {
      const path = this.getSelectedPath();
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

    if (this.state === "EDIT_ADDING") {
      this.eventBus.emit("workarea:update");
      return;
    }

    if (this.state === "DRAWING") {
      const dx = this.points[0].x - offsetX;
      const dy = this.points[0].y - offsetY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.isClosing = dist <= this.CLOSE_DISTANCE && this.points.length >= 2;
      this.eventBus.emit("workarea:update");
    }
  }

  public onMouseUp(_evt: MouseEvent): void {
    if (this.state === "EDIT_ADDING") {
      const path = this.getSelectedPath();
      if (path && this.cursorPos) {
        const [canvasPos] = this.eventBus.request("workarea:adjustForCanvas", {
          position: this.cursorPos,
        });
        path.points.push(this.canvasToLocal(path, canvasPos));
        this.recomputeBounds(path);
        this.eventBus.emit("workarea:update");
      }
      this.state = "IDLE";
      return;
    }

    if (this.state === "EDIT_MOVING") {
      this.state = "IDLE";
      const path = this.getSelectedPath();
      if (path && path.elementId === this.editElementId) {
        this.recomputeBounds(path);
      }
      this.eventBus.emit("workarea:update");
    }
  }
}
