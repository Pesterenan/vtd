import centerHandleMove from "src/assets/icons/move-tool.svg";
import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "src/components/types";
import type { EventBus } from "src/utils/eventBus";

export class GrabTool extends Tool {
  private toolIcon: HTMLImageElement | null = null;
  private startPosition: Position | null = null;
  private isDragging = false;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    super(canvas, eventBus);
    this.toolIcon = new Image(20, 20);
    this.toolIcon.src = centerHandleMove;
  }

  public equip(): void {
    super.equip();
  }

  public unequip(): void {
    this.resetTool();
    super.unequip();
  }

  public resetTool(): void {
    this.startPosition = null;
    this.isDragging = false;
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
    const [centerPosition] = this.eventBus.request("transformBox:position");
    if (!this.isDragging && centerPosition)  {
      this.isDragging = true;
      this.startPosition = {
        x: mousePos.x - centerPosition.x,
        y: mousePos.y - centerPosition.y,
      };
      this.eventBus.emit("workarea:update");
    }
  }

  public onMouseUp(): void {
    this.resetTool();
  }

  public onMouseMove({ offsetX, offsetY }: MouseEvent): void {
    if (this.isDragging && this.startPosition) {
      const [mousePos] = this.eventBus.request("workarea:adjustForCanvas", {
        position: {
          x: offsetX,
          y: offsetY,
        },
      });
      const delta = {
        x: mousePos.x - this.startPosition.x,
        y: mousePos.y - this.startPosition.y,
      };
      this.eventBus.emit("transformBox:updatePosition", { delta });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyUp(): void {}
}
