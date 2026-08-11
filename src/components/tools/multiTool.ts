import { Tool } from "./abstractTool";
import type { EventBus } from "src/utils/eventBus";
import type { Position, Scale } from "../types";
import type { GizmoPart } from "./multiTool.helpers";
import { toDegrees, toRadians, rotatePoint } from "src/utils/transforms";
import {
  ROTATE_RADIUS,
  HIT_THRESHOLD,
  drawMoveGizmo,
  drawRotateGizmo,
  drawScaleGizmo,
  drawSelectGizmo,
  getGizmoPartAt,
} from "./multiTool.helpers";

type MODES = "select" | "move" | "rotate" | "scale";

export class MultiTool extends Tool {
  private currentMode: MODES = "select";
  private selectedGizmoPart: GizmoPart = null;

  private startCenter: Position | null = null;
  private startPosition: Position | null = null;
  private endPosition: Position | null = null;

  private isCropping = false;
  private isDragging = false;
  private isProportional = false;
  private isRelativeMovement = false;

  private originalRotation = 0;
  private rotateInitialRotation = 0;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    super(canvas, eventBus);
    this.eventBus.on("multiTool:setMode", (mode: MODES) => {
      this.setMode(mode);
    });
  }

  public setMode(mode: MODES): void {
    this.currentMode = mode;
    if (mode === "move" && this.isRelativeMovement) {
      const [rotation] = this.eventBus.request("transformBox:rotation");
      this.originalRotation = rotation || 0;
    }
    this.eventBus.emit("multiTool:modeChange", this.currentMode);
    this.eventBus.emit("workarea:update");
  }

  public equip(): void {
    super.equip();
    this.resetTool();
    this.eventBus.emit("multiTool:modeChange", this.currentMode);
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
    this.rotateInitialRotation = 0;
  }

  public resetTool(): void {
    this.currentMode = "select";
    this.resetDragState();
  }

  public draw(): void {
    if (!this.context || !this.workAreaOffset) return;

    if (this.currentMode === "select") {
      drawSelectGizmo(this.context, this.startPosition, this.endPosition);
    }

    this.context.save();
    this.context.translate(this.workAreaOffset.x, this.workAreaOffset.y);
    this.context.scale(this.zoomLevel, this.zoomLevel);

    const [center] = this.eventBus.request("transformBox:position");
    const [anchorPoint] = this.eventBus.request("transformBox:anchorPoint:get");
    const [rotation] = this.eventBus.request("transformBox:rotation");
    if (!center) {
      this.context.restore();
      return;
    }

    switch (this.currentMode) {
      case "move": {
        drawMoveGizmo(this.context, center, this.zoomLevel, {
          isRelative: this.isRelativeMovement,
          rotation: rotation ?? 0,
        });
        break;
      }
      case "rotate": {
        drawRotateGizmo(
          this.context,
          anchorPoint ?? center,
          this.zoomLevel,
          rotation ?? 0,
        );
        break;
      }
      case "scale": {
        drawScaleGizmo(
          this.context,
          anchorPoint ?? center,
          this.zoomLevel,
          rotation ?? 0,
        );
        break;
      }
    }

    this.context.restore();
  }

  protected handleKeyDown(evt: KeyboardEvent): void {
    switch (this.currentMode) {
      case "select": {
        if (evt.key === "Alt") {
          evt.preventDefault();
          this.eventBus.emit("selectTool:isCroppingBoxVisible", true);
        }
        break;
      }
      case "scale": {
        if (evt.key === "Alt") {
          evt.preventDefault();
        }
        break;
      }
      default:
        break;
    }
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
    this.eventBus.emit("multiTool:modeChange", this.currentMode);
  }

  protected handleKeyUp(evt: KeyboardEvent): void {
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
  }

  protected handleMouseDown({
    altKey,
    offsetX,
    offsetY,
    shiftKey,
  }: MouseEvent): void {
    if (!this.toolPos) return;
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
        if (altKey) {
          this.eventBus.emit("transformBox:anchorPoint:set", {
            position: this.toolPos,
          });
          break;
        }
        const [selected] = this.eventBus.request("workarea:selected:get");
        if (!selected || selected.length === 0) {
          this.eventBus.emit("workarea:selectAt", {
            firstPoint: { x: offsetX, y: offsetY },
            secondPoint: { x: offsetX, y: offsetY },
          });
          this.eventBus.emit("workarea:update");
          break;
        }
        if (!center) break;
        const [rotation] = this.eventBus.request("transformBox:rotation");
        const part = getGizmoPartAt(
          this.toolPos,
          center,
          this.isRelativeMovement,
          rotation ?? 0,
          this.zoomLevel,
        );
        if (!part) break;
        this.selectedGizmoPart = part;
        this.isDragging = true;
        if (this.isRelativeMovement) {
          const [rotation] = this.eventBus.request("transformBox:rotation");
          this.originalRotation = rotation || 0;
        }
        this.startPosition = {
          x: this.toolPos.x - center.x,
          y: this.toolPos.y - center.y,
        };
        this.startCenter = { ...center };
        this.eventBus.emit("workarea:update");
        break;
      }

      case "rotate": {
        if (altKey) {
          this.eventBus.emit("transformBox:anchorPoint:set", {
            position: this.toolPos,
          });
          break;
        }
        {
          const [selected] = this.eventBus.request("workarea:selected:get");
          if (!selected || selected.length === 0) {
            this.eventBus.emit("workarea:selectAt", {
              firstPoint: { x: offsetX, y: offsetY },
              secondPoint: { x: offsetX, y: offsetY },
            });
            this.eventBus.emit("workarea:update");
            break;
          }
        }
        if (!center) break;
        const [anchorPoint] = this.eventBus.request(
          "transformBox:anchorPoint:get",
        );
        const radius = ROTATE_RADIUS / this.zoomLevel;
        const threshold = HIT_THRESHOLD / this.zoomLevel;
        const pivot = anchorPoint ?? center;
        const distFromCenter = Math.hypot(
          this.toolPos.x - pivot.x,
          this.toolPos.y - pivot.y,
        );
        if (Math.abs(distFromCenter - radius) >= threshold) break;
        this.isDragging = true;
        this.startPosition = this.toolPos;
        this.startCenter = { ...pivot };
        const [currentRotation] = this.eventBus.request(
          "transformBox:rotation",
        );
        this.rotateInitialRotation = currentRotation || 0;
        break;
      }

      case "scale": {
        if (altKey) {
          this.eventBus.emit("transformBox:anchorPoint:set", {
            position: this.toolPos,
          });
          break;
        }
        {
          const [selected] = this.eventBus.request("workarea:selected:get");
          if (!selected || selected.length === 0) {
            this.eventBus.emit("workarea:selectAt", {
              firstPoint: { x: offsetX, y: offsetY },
              secondPoint: { x: offsetX, y: offsetY },
            });
            this.eventBus.emit("workarea:update");
            break;
          }
        }
        if (!center) break;
        const [rotation] = this.eventBus.request("transformBox:rotation");
        const [anchorPoint] = this.eventBus.request(
          "transformBox:anchorPoint:get",
        );
        const pivot = anchorPoint ?? center;
        const part = getGizmoPartAt(
          this.toolPos,
          pivot,
          true,
          rotation ?? 0,
          this.zoomLevel,
        );
        if (!part) break;
        this.selectedGizmoPart = part;
        this.isDragging = true;
        this.startPosition = this.toolPos;
        this.isProportional = shiftKey;
        break;
      }
    }
  }

  protected handleMouseMove({
    offsetX,
    offsetY,
    movementX,
    movementY,
    shiftKey,
    ctrlKey,
  }: MouseEvent): void {
    if (!this.toolPos) return;
    this.eventBus.emit("transformBox:mousePosition", { position: this.toolPos });

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
            this.toolPos.x - (this.startPosition.x + this.startCenter.x);
          const deltaY =
            this.toolPos.y - (this.startPosition.y + this.startCenter.y);

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
              x: this.toolPos.x - this.startPosition.x,
              y: this.toolPos.y - this.startPosition.y,
            };
          }
        } else {
          newPos = {
            x: this.toolPos.x - this.startPosition.x,
            y: this.toolPos.y - this.startPosition.y,
          };
          if (this.selectedGizmoPart === "xAxis") {
            newPos.y = this.startCenter.y;
          } else if (this.selectedGizmoPart === "yAxis") {
            newPos.x = this.startCenter.x;
          }
        }

        this.eventBus.emit("transformBox:updatePosition", { position: newPos });
        break;
      }

      case "rotate": {
        if (!this.isDragging || !this.startPosition || !this.startCenter) break;
        const currentAngle = Math.atan2(
          this.toolPos.y - this.startCenter.y,
          this.toolPos.x - this.startCenter.x,
        );
        const startingAngle = Math.atan2(
          this.startPosition.y - this.startCenter.y,
          this.startPosition.x - this.startCenter.x,
        );
        let angle = Math.round(toDegrees(currentAngle - startingAngle));
        if (shiftKey) {
          angle = Math.round(angle / 15) * 15;
        } else if (ctrlKey) {
          angle = Math.round(angle / 5) * 5;
        }
        const normalizedAngle = (this.rotateInitialRotation + angle) % 360;
        this.eventBus.emit("transformBox:updateRotation", {
          delta: normalizedAngle,
        });
        break;
      }

      case "scale": {
        if (!this.isDragging || !this.startPosition || !this.selectedGizmoPart)
          break;
        const [props] = this.eventBus.request("transformBox:properties:get");
        if (!props) break;

        const { xSign, ySign } = this.getScaleParams(
          this.selectedGizmoPart,
          props,
        );

        const rotMouse = rotatePoint(this.toolPos, { x: 0, y: 0 }, -props.rotation);
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
        });
        this.startPosition = this.toolPos;
        break;
      }
    }
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

  protected handleMouseUp({ shiftKey }: MouseEvent): void {
    switch (this.currentMode) {
      case "select":
        if (!this.isCropping) {
          this.eventBus.emit("workarea:selectAt", {
            firstPoint: this.startPosition,
            secondPoint: this.endPosition,
            isAddingToSelection: shiftKey,
          });
        }
        break;
    }
    this.resetDragState();
  }
}
