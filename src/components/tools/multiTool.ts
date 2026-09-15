import { Tool } from "./abstractTool";
import type { ContextMenuItem, EventBus } from "src/utils/eventBus";
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
import SelectIcon from "src/assets/icons/select-tool.svg";
import GrabIcon from "src/assets/icons/move-tool.svg";
import RotateIcon from "src/assets/icons/rotate-tool.svg";
import ScaleIcon from "src/assets/icons/scale-tool.svg";

type MODES = "select" | "move" | "rotate" | "scale";

const MODE_OPTIONS: { mode: MODES; label: string; icon: string }[] = [
  { mode: "select", label: "Selecionar (V)", icon: SelectIcon },
  { mode: "move", label: "Mover (G)", icon: GrabIcon },
  { mode: "rotate", label: "Rotacionar (R)", icon: RotateIcon },
  { mode: "scale", label: "Escalar (S)", icon: ScaleIcon },
];

const GIZMO_SCALE_SIGNS: Record<
  string,
  { xSign: 1 | 0 | -1; ySign: 1 | 0 | -1 }
> = {
  xAxis: { xSign: 1, ySign: 0 },
  yAxis: { xSign: 0, ySign: -1 },
  center: { xSign: 1, ySign: 1 },
};
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
        if (this.modifiers.alt) {
          evt.preventDefault();
          this.eventBus.emit("selectTool:isCroppingBoxVisible", true);
        }
        break;
      }
      case "scale": {
        if (this.modifiers.alt) {
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
        if (this.modifiers.alt) {
          evt.preventDefault();
          this.eventBus.emit("selectTool:isCroppingBoxVisible", false);
        }
        break;
      }
      default:
        break;
    }
  }

  protected handleMouseDown(evt: MouseEvent): void {
    if (!this.canvasPos || evt.button !== 0) return;
    const [center] = this.eventBus.request("transformBox:position");

    switch (this.currentMode) {
      case "select":
        if (this.modifiers.alt) {
          const [isHandleSelected] = this.eventBus.request(
            "transformBox:selectHandle",
          );
          if (isHandleSelected) {
            this.isCropping = true;
          }
        }
        this.startPosition = this.mousePos;
        break;

      case "move": {
        if (this.modifiers.alt) {
          this.eventBus.emit("transformBox:anchorPoint:set", {
            position: this.canvasPos,
          });
          break;
        }
        const [selected] = this.eventBus.request("workarea:selected:get");
        if (!selected || selected.length === 0) {
          this.eventBus.emit("workarea:selectAt", {
            firstPoint: this.mousePos,
            secondPoint: this.mousePos,
          });
          this.eventBus.emit("workarea:update");
          break;
        }
        if (!center) break;
        const [rotation] = this.eventBus.request("transformBox:rotation");
        const part = getGizmoPartAt(
          this.canvasPos,
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
          x: this.canvasPos.x - center.x,
          y: this.canvasPos.y - center.y,
        };
        this.startCenter = { ...center };
        this.eventBus.emit("workarea:update");
        break;
      }

      case "rotate": {
        if (this.modifiers.alt) {
          this.eventBus.emit("transformBox:anchorPoint:set", {
            position: this.canvasPos,
          });
          break;
        }
        {
          const [selected] = this.eventBus.request("workarea:selected:get");
          if (!selected || selected.length === 0) {
            this.eventBus.emit("workarea:selectAt", {
              firstPoint: this.mousePos,
              secondPoint: this.mousePos,
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
          this.canvasPos.x - pivot.x,
          this.canvasPos.y - pivot.y,
        );
        if (Math.abs(distFromCenter - radius) >= threshold) break;
        this.isDragging = true;
        this.startPosition = this.canvasPos;
        this.startCenter = { ...pivot };
        const [currentRotation] = this.eventBus.request(
          "transformBox:rotation",
        );
        this.rotateInitialRotation = currentRotation || 0;
        break;
      }

      case "scale": {
        if (this.modifiers.alt) {
          this.eventBus.emit("transformBox:anchorPoint:set", {
            position: this.canvasPos,
          });
          break;
        }
        {
          const [selected] = this.eventBus.request("workarea:selected:get");
          if (!selected || selected.length === 0) {
            this.eventBus.emit("workarea:selectAt", {
              firstPoint: this.mousePos,
              secondPoint: this.mousePos,
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
          this.canvasPos,
          pivot,
          true,
          rotation ?? 0,
          this.zoomLevel,
        );
        if (!part) break;
        this.selectedGizmoPart = part;
        this.isDragging = true;
        this.startPosition = this.canvasPos;
        this.isProportional = this.modifiers.shift;
        break;
      }
    }
  }

  protected handleMouseMove({ movementX, movementY }: MouseEvent): void {
    if (!this.canvasPos) return;
    this.eventBus.emit("transformBox:mousePosition", {
      position: this.canvasPos,
    });

    switch (this.currentMode) {
      case "select": {
        if (this.startPosition) {
          if (this.isCropping) {
            this.eventBus.emit("transformBox:updateCropping", {
              position: { x: movementX, y: movementY },
            });
          } else {
            if (this.mousePos) {
              const distance = Math.hypot(
                this.mousePos.x - this.startPosition.x,
                this.mousePos.y - this.startPosition.y,
              );
              if (distance > Tool.DRAGGING_DISTANCE) {
                this.endPosition = this.mousePos;
                this.isDragging = true;
              }
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
            this.canvasPos.x - (this.startPosition.x + this.startCenter.x);
          const deltaY =
            this.canvasPos.y - (this.startPosition.y + this.startCenter.y);

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
              x: this.canvasPos.x - this.startPosition.x,
              y: this.canvasPos.y - this.startPosition.y,
            };
          }
        } else {
          newPos = {
            x: this.canvasPos.x - this.startPosition.x,
            y: this.canvasPos.y - this.startPosition.y,
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
          this.canvasPos.y - this.startCenter.y,
          this.canvasPos.x - this.startCenter.x,
        );
        const startingAngle = Math.atan2(
          this.startPosition.y - this.startCenter.y,
          this.startPosition.x - this.startCenter.x,
        );
        let angle = Math.round(toDegrees(currentAngle - startingAngle));
        if (this.modifiers.shift) {
          angle = Math.round(angle / 15) * 15;
        } else if (this.modifiers.ctrl) {
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

        const { xSign, ySign } = this.getScaleSigns(this.selectedGizmoPart);

        const rotMouse = rotatePoint(
          this.canvasPos,
          { x: 0, y: 0 },
          -props.rotation,
        );
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
        this.startPosition = this.canvasPos;
        break;
      }
    }
  }

  private getScaleSigns(gizmoPart: GizmoPart) {
    return (
      GIZMO_SCALE_SIGNS[gizmoPart as string] ?? {
        xSign: 0 as const,
        ySign: 0 as const,
      }
    );
  }

  protected handleMouseUp(evt: MouseEvent): void {
    if (evt.button !== 0) return;
    switch (this.currentMode) {
      case "select":
        if (!this.isCropping) {
          this.eventBus.emit("workarea:selectAt", {
            firstPoint: this.startPosition
              ? this.toCanvas(this.startPosition)
              : null,
            secondPoint: this.endPosition
              ? this.toCanvas(this.endPosition)
              : null,
            isAddingToSelection: this.modifiers.shift,
          });
        }
        break;
    }
    this.resetDragState();
  }

  protected handleContextMenu(evt: MouseEvent): void {
    evt.preventDefault();

    const [selected] = this.eventBus.request("workarea:selected:get");
    if (!selected || selected.length === 0) return;

    const items: ContextMenuItem[] = MODE_OPTIONS.map(
      ({ mode, label, icon }) => ({
        type: "item",
        id: mode,
        label,
        icon,
        active: mode === this.currentMode,
        action: () => {
          this.setMode(mode);
        },
      }),
    );

    this.eventBus.emit("workarea:contextMenu:open", {
      position: { x: evt.clientX, y: evt.clientY },
      items,
    });
  }
}
