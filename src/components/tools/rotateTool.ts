import centerHandleRotate from "src/assets/icons/rotate-tool.svg";
import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "src/components/types";
import type { EventBus } from "src/utils/eventBus";
import { toDegrees } from "src/utils/transforms";

export class RotateTool extends Tool {
  private toolIcon: HTMLImageElement | null = null;
  private startPosition: Position | null = null;
  private isRotating = false;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    super(canvas, eventBus);
    this.toolIcon = new Image(20, 20);
    this.toolIcon.src = centerHandleRotate;
  }

  public equip(): void {
    super.equip();
  }

  public unequip(): void {
    this.resetTool();
    super.unequip();
  }

  public resetTool() {
    this.startPosition = null;
    this.isRotating = false;
  }

  public draw(): void {
    const [anchor] = this.eventBus.request("transformBox:anchorPoint:get");
    if (this.toolIcon && this.context && anchor) {
      const [zoomLevel] = this.eventBus.request("zoomLevel:get");
      const [workAreaOffset] = this.eventBus.request("workarea:offset:get");

      this.context.save();
      this.context.translate(workAreaOffset.x, workAreaOffset.y);
      this.context.scale(zoomLevel, zoomLevel);
      this.context.drawImage(
        this.toolIcon,
        anchor.x - (this.toolIcon.width * 0.5) / zoomLevel,
        anchor.y - (this.toolIcon.height * 0.5) / zoomLevel,
        this.toolIcon.width / zoomLevel,
        this.toolIcon.height / zoomLevel,
      );
      this.context.restore();
    }
  }

  public onMouseDown({ altKey, offsetX, offsetY }: MouseEvent): void {
    const [mousePos] = this.eventBus.request("workarea:adjustForCanvas", {
      position: {
        x: offsetX,
        y: offsetY,
      },
    });
    if (altKey) {
      this.eventBus.emit("transformBox:anchorPoint:change", { position: mousePos });
      this.eventBus.emit("workarea:update");
      return;
    }
    if (!this.isRotating) {
      this.isRotating = true;
      this.startPosition = mousePos;
      this.eventBus.emit("workarea:update");
    }
  }

  public onMouseUp(): void {
    this.resetTool();
  }

  public onMouseMove({ offsetX, offsetY }: MouseEvent): void {
    const [anchor] = this.eventBus.request("transformBox:anchorPoint:get");
    if (this.isRotating && this.startPosition && anchor) {
      const [mousePos] = this.eventBus.request("workarea:adjustForCanvas", {
        position: {
          x: offsetX,
          y: offsetY,
        },
      });
      const startingAngle = Math.atan2(
        this.startPosition.y - anchor.y,
        this.startPosition.x - anchor.x,
      );
      const currentAngle = Math.atan2(
        mousePos.y - anchor.y,
        mousePos.x - anchor.x,
      );
      const angle = toDegrees(currentAngle - startingAngle);
      const [rotation] = this.eventBus.request("transformBox:rotation");
      const normalizedAngle = (rotation + angle) % 360;
      this.eventBus.emit("transformBox:updateRotation", { delta: normalizedAngle });
      this.startPosition = mousePos;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyUp(): void {}
}
