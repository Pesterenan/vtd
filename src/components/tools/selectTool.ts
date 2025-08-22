import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "../types";

export class SelectTool extends Tool {
  private firstPoint: Position | null = null;
  private secondPoint: Position | null = null;
  private isCropping = false;

  public equip(): void {
    super.equip();
  }

  public unequip(): void {
    this.resetTool();
    super.unequip();
  }
  
  private resetTool(): void {
    this.firstPoint = null;
    this.secondPoint = null;
    this.isCropping = false;
  }

  public draw(): void {
    if (this.firstPoint && this.secondPoint && this.context) {
      this.context.save();
      this.context.strokeStyle = "black";
      this.context.setLineDash([3, 3]);
      this.context.lineWidth = 2;
      this.context.strokeRect(
        this.firstPoint.x,
        this.firstPoint.y,
        this.secondPoint.x - this.firstPoint.x,
        this.secondPoint.y - this.firstPoint.y,
      );
      this.context.restore();
    }
  }

  public onMouseDown({ altKey, offsetX, offsetY }: MouseEvent): void {
    this.firstPoint = { x: offsetX, y: offsetY };
    const [isHandleSelected] = this.eventBus.request(
      "transformBox:selectHandle",
    );

    if (altKey && isHandleSelected) {
      this.isCropping = true;
    }
  }

  public onMouseMove({ offsetX, offsetY, movementX, movementY }: MouseEvent): void {
    const [mousePos] = this.eventBus.request("workarea:adjustForCanvas", {
      position: {
        x: offsetX,
        y: offsetY,
      },
    });
    this.eventBus.emit("transformBox:hoverHandle", { position: mousePos });

    if (this.firstPoint) {
      if (this.isCropping) {
        this.eventBus.emit("transformBox:updateCropping", {
          position: { x: movementX, y: movementY },
        });
      } else {
        const distance = Math.hypot(
          offsetX - this.firstPoint.x,
          offsetY - this.firstPoint.y,
        );
        if (distance > Tool.DRAGGING_DISTANCE) {
          this.secondPoint = { x: offsetX, y: offsetY };
        }
      }
    }
    this.eventBus.emit("workarea:update");
  }

  public onMouseUp(): void {
    if (!this.isCropping) {
      this.eventBus.emit("workarea:selectAt", {
        firstPoint: this.firstPoint,
        secondPoint: this.secondPoint,
      });
    }
    this.resetTool();
    this.eventBus.emit("workarea:update");
  }

  public onKeyDown(evt: KeyboardEvent): void {
    if (evt.altKey) {
      evt.preventDefault();
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyUp(): void {}
}
