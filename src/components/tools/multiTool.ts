import { Tool } from "./abstractTool";
import type { EventBus } from "src/utils/eventBus";
import type { Position, Scale } from "../types";
import { toDegrees, toRadians, rotatePoint } from "src/utils/transforms";

type MODES = "select" | "move" | "rotate" | "scale";
type GizmoPart = "xAxis" | "yAxis" | "center" | "rotateRing" | null;

const GIZMO_LENGTH = 50;
const ARROW_HEAD_SIZE = 10;
const CENTER_SIZE = 6;
const HANDLE_SIZE = 8;
const ROTATE_RADIUS = 40;
const HIT_THRESHOLD = 12;

export class MultiTool extends Tool {
  private currentMode: MODES = "select";
  private isDragging = false;
  private isRelativeMovement = false;
  private originalRotation = 0;
  private startPosition: Position | null = null;
  private endPosition: Position | null = null;
  private selectedGizmoPart: GizmoPart = null;
  private startCenter: Position | null = null;
  private isProportional = false;
  private isCropping = false;
  private localAnchor: Position | null = null;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    super(canvas, eventBus);
  }

  public equip(): void {
    super.equip();
  }

  public unequip(): void {
    this.resetTool();
    super.unequip();
  }

  public resetDragState(): void {
    this.isDragging = false;
    this.startPosition = null;
    this.endPosition = null;
    this.selectedGizmoPart = null;
    this.startCenter = null;
    this.isProportional = false;
    this.isCropping = false;
    this.localAnchor = null;
  }

  public resetTool(): void {
    this.currentMode = "select";
    this.resetDragState();
    this.isRelativeMovement = false;
    this.originalRotation = 0;
  }

  public draw(): void {
    if (!this.context) return;

    if (this.currentMode === "select") {
      this.drawSelectGizmo();
    }

    const [zoomLevel] = this.eventBus.request("zoomLevel:get");
    const [workAreaOffset] = this.eventBus.request("workarea:offset:get");

    this.context.save();
    this.context.translate(workAreaOffset.x, workAreaOffset.y);
    this.context.scale(zoomLevel, zoomLevel);

    const [center] = this.eventBus.request("transformBox:position");
    if (!center) {
      this.context.restore();
      return;
    }

    switch (this.currentMode) {
      case "move":
        this.drawMoveGizmo(center, zoomLevel);
        break;
      case "rotate":
        this.drawRotateGizmo(center, zoomLevel);
        break;
      case "scale":
        this.drawScaleGizmo(center, zoomLevel);
        break;
    }

    this.context.restore();
  }

  private drawSelectGizmo(): void {
    if (!this.startPosition || !this.endPosition || !this.context) return;
    const ctx = this.context;
    ctx.save();
    ctx.strokeStyle = "black";
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 2;
    ctx.strokeRect(
      this.startPosition.x,
      this.startPosition.y,
      this.endPosition.x - this.startPosition.x,
      this.endPosition.y - this.startPosition.y,
    );
    ctx.restore();
  }

  private drawMoveGizmo(anchor: Position, zoomLevel: number): void {
    const ctx = this.context!;
    const len = GIZMO_LENGTH / zoomLevel;
    const head = ARROW_HEAD_SIZE / zoomLevel;
    const hc = CENTER_SIZE / zoomLevel;
    const lw = 2 / zoomLevel;

    ctx.save();
    ctx.lineWidth = lw;

    if (this.isRelativeMovement) {
      const [rotation] = this.eventBus.request("transformBox:rotation");
      if (rotation !== 0) {
        ctx.translate(anchor.x, anchor.y);
        ctx.rotate(toRadians(rotation));
        ctx.translate(-anchor.x, -anchor.y);
      }
    }

    ctx.strokeStyle = "#ff4444";
    ctx.fillStyle = "#ff4444";
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(anchor.x + len, anchor.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(anchor.x + len, anchor.y);
    ctx.lineTo(anchor.x + len - head, anchor.y - head * 0.5);
    ctx.lineTo(anchor.x + len - head, anchor.y + head * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#44cc44";
    ctx.fillStyle = "#44cc44";
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(anchor.x, anchor.y - len);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y - len);
    ctx.lineTo(anchor.x - head * 0.5, anchor.y - len + head);
    ctx.lineTo(anchor.x + head * 0.5, anchor.y - len + head);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5 / zoomLevel;
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(anchor.x - hc, anchor.y - hc, hc * 2, hc * 2);
    ctx.strokeRect(anchor.x - hc, anchor.y - hc, hc * 2, hc * 2);
    ctx.restore();
  }

  private drawRotateGizmo(center: Position, zoomLevel: number): void {
    const ctx = this.context!;
    const radius = ROTATE_RADIUS / zoomLevel;

    ctx.save();
    ctx.strokeStyle = "#4488ff";
    ctx.lineWidth = 2 / zoomLevel;
    ctx.setLineDash([4 / zoomLevel, 4 / zoomLevel]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    const [rotation] = this.eventBus.request("transformBox:rotation");
    const angleRad = toRadians(rotation);
    const dotX = center.x + radius * Math.cos(angleRad);
    const dotY = center.y + radius * Math.sin(angleRad);
    ctx.fillStyle = "#4488ff";
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4 / zoomLevel, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawScaleGizmo(anchor: Position, zoomLevel: number): void {
    const ctx = this.context!;
    const len = GIZMO_LENGTH / zoomLevel;
    const hh = HANDLE_SIZE / zoomLevel;
    const hc = CENTER_SIZE / zoomLevel;
    const lw = 2 / zoomLevel;

    ctx.lineWidth = lw;

    ctx.strokeStyle = "#ff4444";
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(anchor.x + len, anchor.y);
    ctx.stroke();
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(anchor.x + len - hh, anchor.y - hh, hh * 2, hh * 2);

    ctx.strokeStyle = "#44cc44";
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(anchor.x, anchor.y - len);
    ctx.stroke();
    ctx.fillStyle = "#44cc44";
    ctx.fillRect(anchor.x - hh, anchor.y - len - hh, hh * 2, hh * 2);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5 / zoomLevel;
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(anchor.x - hc, anchor.y - hc, hc * 2, hc * 2);
    ctx.strokeRect(anchor.x - hc, anchor.y - hc, hc * 2, hc * 2);
  }

  private getGizmoPartAt(mousePos: Position, anchor: Position): GizmoPart {
    let testPos = mousePos;
    if (this.isRelativeMovement) {
      const [rotation] = this.eventBus.request("transformBox:rotation");
      if (rotation !== 0) {
        testPos = rotatePoint(mousePos, anchor, -rotation);
      }
    }
    const [zoomLevel] = this.eventBus.request("zoomLevel:get");
    const gizmoLen = GIZMO_LENGTH / zoomLevel;
    const threshold = HIT_THRESHOLD / zoomLevel;
    const hc = CENTER_SIZE / zoomLevel;

    if (
      testPos.x >= anchor.x - hc - threshold &&
      testPos.x <= anchor.x + hc + threshold &&
      testPos.y >= anchor.y - hc - threshold &&
      testPos.y <= anchor.y + hc + threshold
    ) {
      return "center";
    }

    if (
      testPos.y >= anchor.y - threshold &&
      testPos.y <= anchor.y + threshold &&
      testPos.x >= anchor.x - threshold &&
      testPos.x <= anchor.x + gizmoLen + threshold
    ) {
      return "xAxis";
    }

    if (
      testPos.x >= anchor.x - threshold &&
      testPos.x <= anchor.x + threshold &&
      testPos.y >= anchor.y - gizmoLen - threshold &&
      testPos.y <= anchor.y + threshold
    ) {
      return "yAxis";
    }

    const dist = Math.hypot(testPos.x - anchor.x, testPos.y - anchor.y);
    const radius = ROTATE_RADIUS / zoomLevel;
    if (Math.abs(dist - radius) < threshold) {
      return "rotateRing";
    }

    return null;
  }

  public onKeyDown(evt: KeyboardEvent): void {
    switch (this.currentMode) {
      case "select": {
        if (evt.key === "Alt") {
          evt.preventDefault();
          this.eventBus.emit("selectTool:isCroppingBoxVisible", true);
        }
        break;
      }
      default:
        break;
    }
    const previousMode = this.currentMode;
    switch (evt.code) {
      case "KeyV":
        this.currentMode = "select";
        break;
      case "KeyG":
        this.currentMode = "move";
        if (this.isRelativeMovement) {
          const [rotation] = this.eventBus.request("transformBox:rotation");
          this.originalRotation = rotation || 0;
        }
        break;
      case "KeyR":
        this.currentMode = "rotate";
        break;
      case "KeyS":
        this.currentMode = "scale";
        break;
      default:
        return;
    }
    if (this.currentMode !== previousMode) {
      if (this.currentMode !== "move") {
        this.isRelativeMovement = false;
        this.originalRotation = 0;
      }
    }
    this.eventBus.emit("workarea:update");
  }

  public onKeyUp(evt: KeyboardEvent): void {
    switch (this.currentMode) {
      case "move": {
        if (evt.code === "KeyF") {
          this.isRelativeMovement = !this.isRelativeMovement;

          if (this.isRelativeMovement) {
            const [rotation] = this.eventBus.request("transformBox:rotation");
            this.originalRotation = rotation || 0;
          } else {
            this.originalRotation = 0;
          }
        }
        break;
      }
      case "select": {
        if (evt.key === "Alt") {
          evt.preventDefault();
          this.eventBus.emit("selectTool:isCroppingBoxVisible", false);
        }
        break;
      }
      default:
        break;
    }
    this.eventBus.emit("workarea:update");
  }

  public onMouseDown({ altKey, offsetX, offsetY, shiftKey }: MouseEvent): void {
    const [mousePos] = this.eventBus.request("workarea:adjustForCanvas", {
      position: { x: offsetX, y: offsetY },
    });
    const [center] = this.eventBus.request("transformBox:position");

    switch (this.currentMode) {
      case "select":
        if (altKey) {
          const [isHandleSelected] = this.eventBus.request(
            "transformBox:selectHandle",
          );
          if (isHandleSelected) {
            this.isCropping = true;
          }
        }
        this.startPosition = { x: offsetX, y: offsetY };
        break;

      case "move": {
        if (!center) break;
        const part = this.getGizmoPartAt(mousePos, center);
        if (!part) break;
        this.selectedGizmoPart = part;
        this.isDragging = true;
        if (this.isRelativeMovement) {
          const [rotation] = this.eventBus.request("transformBox:rotation");
          this.originalRotation = rotation || 0;
        }
        this.startPosition = {
          x: mousePos.x - center.x,
          y: mousePos.y - center.y,
        };
        this.startCenter = { ...center };
        this.eventBus.emit("workarea:update");
        break;
      }

      case "rotate": {
        if (altKey) {
          this.localAnchor = { ...mousePos };
          this.eventBus.emit("workarea:update");
          break;
        }
        if (!center) break;
        const [zoomLevel] = this.eventBus.request("zoomLevel:get");
        const radius = ROTATE_RADIUS / zoomLevel;
        const threshold = HIT_THRESHOLD / zoomLevel;
        const pivot = this.localAnchor ?? center;
        const distFromCenter = Math.hypot(
          mousePos.x - center.x,
          mousePos.y - center.y,
        );
        if (Math.abs(distFromCenter - radius) >= threshold) break;
        this.isDragging = true;
        this.startPosition = mousePos;
        this.startCenter = { ...pivot };
        if (this.localAnchor) {
          this.eventBus.emit("transformBox:anchorPoint:change", {
            position: this.localAnchor,
          });
        }
        this.eventBus.emit("workarea:update");
        break;
      }

      case "scale": {
        if (altKey) {
          this.localAnchor = { ...mousePos };
          this.eventBus.emit("workarea:update");
          break;
        }
        if (!center) break;
        const part = this.getGizmoPartAt(mousePos, center);
        if (!part) break;
        this.selectedGizmoPart = part;
        this.isDragging = true;
        this.startPosition = mousePos;
        this.isProportional = shiftKey;
        this.eventBus.emit("workarea:update");
        break;
      }
    }
  }

  public onMouseMove({
    offsetX,
    offsetY,
    movementX,
    movementY,
    shiftKey,
    ctrlKey,
  }: MouseEvent): void {
    const [mousePos] = this.eventBus.request("workarea:adjustForCanvas", {
      position: { x: offsetX, y: offsetY },
    });
    this.eventBus.emit("transformBox:hoverHandle", { position: mousePos });

    switch (this.currentMode) {
      case "select": {
        if (this.startPosition) {
          if (this.isCropping) {
            this.eventBus.emit("transformBox:updateCropping", {
              position: { x: movementX, y: movementY },
            });
          } else {
            const distance = Math.hypot(
              offsetX - this.startPosition.x,
              offsetY - this.startPosition.y,
            );
            if (distance > Tool.DRAGGING_DISTANCE) {
              this.endPosition = { x: offsetX, y: offsetY };
              this.isDragging = true;
            }
          }
        }
        break;
      }

      case "move": {
        if (!this.isDragging || !this.startPosition || !this.startCenter) break;

        let newPos: Position;

        if (this.isRelativeMovement && this.originalRotation !== 0) {
          const rotRad = toRadians(this.originalRotation);
          const cos = Math.cos(rotRad);
          const sin = Math.sin(rotRad);
          const deltaX =
            mousePos.x - (this.startPosition.x + this.startCenter.x);
          const deltaY =
            mousePos.y - (this.startPosition.y + this.startCenter.y);

          if (this.selectedGizmoPart === "xAxis") {
            const t = deltaX * cos + deltaY * sin;
            newPos = {
              x: this.startCenter.x + t * cos,
              y: this.startCenter.y + t * sin,
            };
          } else if (this.selectedGizmoPart === "yAxis") {
            const t = -deltaX * sin + deltaY * cos;
            newPos = {
              x: this.startCenter.x - t * sin,
              y: this.startCenter.y + t * cos,
            };
          } else {
            newPos = {
              x: mousePos.x - this.startPosition.x,
              y: mousePos.y - this.startPosition.y,
            };
          }
        } else {
          // Lógica ABSOLUTA existente (inalterada)
          newPos = {
            x: mousePos.x - this.startPosition.x,
            y: mousePos.y - this.startPosition.y,
          };
          if (this.selectedGizmoPart === "xAxis") {
            newPos.y = this.startCenter.y;
          } else if (this.selectedGizmoPart === "yAxis") {
            newPos.x = this.startCenter.x;
          }
        }

        this.eventBus.emit("transformBox:updatePosition", { position: newPos });
        this.eventBus.emit("workarea:update");
        break;
      }

      case "rotate": {
        if (!this.isDragging || !this.startPosition || !this.startCenter) break;
        const currentAngle = Math.atan2(
          mousePos.y - this.startCenter.y,
          mousePos.x - this.startCenter.x,
        );
        const startingAngle = Math.atan2(
          this.startPosition.y - this.startCenter.y,
          this.startPosition.x - this.startCenter.x,
        );
        let angle = toDegrees(currentAngle - startingAngle);
        if (shiftKey) {
          angle = Math.round(angle / 5) * 5;
        } else if (ctrlKey) {
          angle = Math.round(angle);
        }
        const [rotation] = this.eventBus.request("transformBox:rotation");
        const normalizedAngle = (rotation + angle) % 360;
        this.eventBus.emit("transformBox:updateRotation", {
          delta: normalizedAngle,
        });
        this.startPosition = mousePos;
        this.eventBus.emit("workarea:update");
        break;
      }

      case "scale": {
        if (!this.isDragging || !this.startPosition || !this.selectedGizmoPart)
          break;
        const [props] = this.eventBus.request("transformBox:properties:get");
        if (!props) break;

        const { xSign, ySign, anchor } = this.getScaleParams(
          this.selectedGizmoPart,
          props,
        );

        const rotMouse = rotatePoint(mousePos, { x: 0, y: 0 }, -props.rotation);
        const rotStart = rotatePoint(
          this.startPosition,
          { x: 0, y: 0 },
          -props.rotation,
        );

        const rawRatio = {
          x:
            props.size.width !== 0
              ? ((rotMouse.x - rotStart.x) * xSign) / props.size.width
              : 0,
          y:
            props.size.height !== 0
              ? ((rotMouse.y - rotStart.y) * ySign) / props.size.height
              : 0,
        };

        let delta: Scale;
        if (this.selectedGizmoPart === "center" || this.isProportional) {
          let scaleFactor: number;
          if (xSign !== 0 && ySign !== 0) {
            scaleFactor = 1 + (rawRatio.x + rawRatio.y) / 2;
          } else if (xSign !== 0) {
            scaleFactor = 1 + rawRatio.x;
          } else {
            scaleFactor = 1 + rawRatio.y;
          }
          delta = { x: scaleFactor, y: scaleFactor };
        } else {
          delta = { x: 1 + rawRatio.x, y: 1 + rawRatio.y };
        }

        this.eventBus.emit("transformBox:updateScale", {
          delta,
          anchor: this.localAnchor ?? anchor,
        });
        this.startPosition = mousePos;
        break;
      }
    }
    this.eventBus.emit("workarea:update");
  }

  private getScaleParams(
    gizmoPart: GizmoPart,
    props: {
      position: Position;
      size: { width: number; height: number };
      rotation: number;
    },
  ): { xSign: 1 | 0 | -1; ySign: 1 | 0 | -1; anchor: Position } {
    switch (gizmoPart) {
      case "xAxis":
        return { xSign: 1, ySign: 0, anchor: { ...props.position } };
      case "yAxis":
        return { xSign: 0, ySign: -1, anchor: { ...props.position } };
      case "center":
        return { xSign: 1, ySign: 1, anchor: { ...props.position } };
      default:
        return { xSign: 0, ySign: 0, anchor: { ...props.position } };
    }
  }

  public onMouseUp(): void {
    switch (this.currentMode) {
      case "select":
        if (!this.isCropping) {
          this.eventBus.emit("workarea:selectAt", {
            firstPoint: this.startPosition,
            secondPoint: this.endPosition,
          });
        }
        break;
    }
    if (this.localAnchor) {
      const [center] = this.eventBus.request("transformBox:position");
      if (center) {
        this.eventBus.emit("transformBox:anchorPoint:change", {
          position: center,
        });
      }
    }
    this.resetDragState();
    this.eventBus.emit("workarea:update");
  }
}
