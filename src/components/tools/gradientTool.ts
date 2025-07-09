import { GradientElement } from "src/components/elements/gradientElement";
import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "src/components/types";
import { BB } from "src/utils/bb";
import { linearInterpolation } from "src/utils/easing";

export class GradientTool extends Tool {
  private activeGradientElement: GradientElement | null = null;
  private colorsStops: GradientElement["colorStops"] | null = null;
  private isCreating = false;
  private isDragging = false;
  private isHoveringEndPos = false;
  private isHoveringStartPos = false;
  private startPosition: Position | null = null;
  private endPosition: Position | null = null;

  public equip(): void {
    super.equip();
    this.resetTool();
    this.selectActiveGradient();
    this.eventBus.on("workarea:selectAt", () => {
      this.resetTool();
      this.selectActiveGradient();
    });
  }

  public unequip(): void {
    this.resetTool();
    super.unequip();
  }

  public resetTool(): void {
    this.activeGradientElement = null;
    this.colorsStops = null;
    this.endPosition = null;
    this.isCreating = false;
    this.isDragging = false;
    this.startPosition = null;
  }

  private drawColorStop(
    context: CanvasRenderingContext2D,
    position: Position,
    color: string,
  ) {
    context.fillStyle = "#FFFFFF";
    context.beginPath();
    context.arc(position.x, position.y, 8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#777777";
    context.beginPath();
    context.arc(position.x, position.y, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = color;
    context.beginPath();
    context.arc(position.x, position.y, 4, 0, Math.PI * 2);
    context.fill();
  }

  public draw(): void {
    if (
      this.startPosition &&
      this.endPosition &&
      this.context &&
      this.colorsStops
    ) {
      this.context.save();
      for (const cs of this.colorsStops) {
        const posX = linearInterpolation(
          this.startPosition.x,
          this.endPosition.x,
          cs.portion,
        );
        const posY = linearInterpolation(
          this.startPosition.y,
          this.endPosition.y,
          cs.portion,
        );
        this.drawColorStop(this.context, { x: posX, y: posY }, cs.color);
      }
      this.context.restore();
    }
  }

  public onMouseDown({ offsetX, offsetY }: MouseEvent): void {
    if (this.activeGradientElement === null) {
      this.isCreating = true;
      this.eventBus.emit("edit:gradient", {
        position: { x: offsetX, y: offsetY },
      });
      this.selectActiveGradient();
    }
    if (!this.isHoveringStartPos && !this.isHoveringEndPos) {
      this.startPosition = { x: offsetX, y: offsetY };
      this.endPosition = { x: offsetX, y: offsetY };
    }
    this.isDragging = true;
    this.eventBus.emit("workarea:update");
  }

  public onMouseUp(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    if (this.isCreating) {
      this.endPosition = { x: offsetX, y: offsetY };
      this.isCreating = false;
      this.isDragging = false;
    }

    if (!this.isHoveringStartPos && !this.isHoveringEndPos) {
      this.endPosition = { x: offsetX, y: offsetY };
    }
    this.isHoveringStartPos = false;
    this.isHoveringEndPos = false;

    this.isDragging = false;
    this.eventBus.emit("workarea:update");
  }

  public onMouseMove({ offsetX, offsetY, shiftKey }: MouseEvent): void {
    if (this.startPosition && this.endPosition) {
      const mousePosition = { x: offsetX, y: offsetY };
      const startPosBB = new BB(this.startPosition, 20);
      const endPosBB = new BB(this.endPosition, 20);
      this.isHoveringEndPos = endPosBB.isPointWithinBB(mousePosition);
      this.isHoveringStartPos =
        !this.isHoveringEndPos && startPosBB.isPointWithinBB(mousePosition);
    }
    if (this.isCreating) {
      this.endPosition = { x: offsetX, y: offsetY };
      return;
    }
    if (this.isDragging) {
      if (this.isHoveringStartPos) {
        if (shiftKey && this.endPosition) {
          const isCloserToX = Math.abs(offsetX - this.endPosition.x) < 20;
          const isCloserToY = Math.abs(offsetY - this.endPosition.y) < 20;
          this.startPosition = {
            x: isCloserToX ? this.endPosition.x : offsetX,
            y: isCloserToY ? this.endPosition.y : offsetY,
          };
        } else {
          this.startPosition = { x: offsetX, y: offsetY };
        }
      }
      if (this.isHoveringEndPos) {
        if (shiftKey && this.startPosition) {
          const isCloserToX = Math.abs(offsetX - this.startPosition.x) < 20;
          const isCloserToY = Math.abs(offsetY - this.startPosition.y) < 20;
          this.endPosition = {
            x: isCloserToX ? this.startPosition.x : offsetX,
            y: isCloserToY ? this.startPosition.y : offsetY,
          };
        } else {
          this.endPosition = { x: offsetX, y: offsetY };
        }
      }
      this.modifyGradientPoints();
    }
    this.eventBus.emit("workarea:update");
  }

  private selectActiveGradient(): void {
    const [selectedElements] = this.eventBus.request("workarea:selected:get");
    if (
      selectedElements &&
      selectedElements.length === 1 &&
      selectedElements[0] instanceof GradientElement
    ) {
      this.activeGradientElement = selectedElements[0];
      const [startPos] = this.eventBus.request("workarea:adjustForScreen", {
        position: this.activeGradientElement.startPosition,
      });
      const [endPos] = this.eventBus.request("workarea:adjustForScreen", {
        position: this.activeGradientElement.endPosition,
      });
      this.colorsStops = this.activeGradientElement.colorStops;
      this.startPosition = startPos;
      this.endPosition = endPos;
      this.isCreating = false;
      this.eventBus.emit("workarea:update");
    }
  }

  private modifyGradientPoints(): void {
    if (this.activeGradientElement === null) return;
    if (this.startPosition && this.endPosition) {
      const [gradStartPos] = this.eventBus.request("workarea:adjustForCanvas", {
        position: this.startPosition,
      });
      const [gradEndPos] = this.eventBus.request("workarea:adjustForCanvas", {
        position: this.endPosition,
      });
      this.activeGradientElement.startPosition = gradStartPos;
      this.activeGradientElement.endPosition = gradEndPos;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyUp(): void {}
}
