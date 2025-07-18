import { GradientElement } from "src/components/elements/gradientElement";
import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "src/components/types";
import { Vector } from "src/utils/vector";
import { clamp, linearInterpolation } from "src/utils/easing";

export class GradientTool extends Tool {
  private activeGradientElement: GradientElement | null = null;
  private colorsStops: GradientElement["colorStops"] | null = null;
  private isDraggingEndPoints = false;
  private isHoveringEnd = false;
  private isHoveringStart = false;
  private isDraggingColorStop = false;
  private activeColorStop: number | null = null;
  private startPosition: Position | null = null;
  private endPosition: Position | null = null;
  private firstPoint: Position | null = null;
  private isCreating = false;

  public equip(): void {
    super.equip();
    this.resetTool();
    this.selectActiveGradient();
    this.eventBus.on(
      "edit:gradientUpdateColorStops",
      this.modifyGradientPoints,
    );
    this.eventBus.on("workarea:selectById", this.selectActiveGradient);
    this.eventBus.on("workarea:selectAt", this.selectActiveGradient);
    this.eventBus.on("workarea:deleteElement", this.resetTool);
  }

  public unequip(): void {
    this.resetTool();
    super.unequip();
    this.eventBus.off(
      "edit:gradientUpdateColorStops",
      this.modifyGradientPoints,
    );
    this.eventBus.off("workarea:selectById", this.selectActiveGradient);
    this.eventBus.off("workarea:selectAt", this.selectActiveGradient);
    this.eventBus.off("workarea:deleteElement", this.resetTool);
  }

  public resetTool = () : void => {
    this.activeGradientElement = null;
    this.colorsStops = null;
    this.endPosition = null;
    this.isDraggingEndPoints = false;
    this.startPosition = null;
    this.eventBus.emit("workarea:update");
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
    this.firstPoint = { x: offsetX, y: offsetY };

    if (this.activeGradientElement) {
      if (this.isHoveringStart || this.isHoveringEnd) {
        this.isDraggingEndPoints = true;
      } else if (this.activeColorStop !== null) {
        this.isDraggingColorStop = true;
      }
    } else {
      this.isCreating = true;
    }
  }

  public onMouseUp(): void {
    this.isDraggingEndPoints = false;
    this.isDraggingColorStop = false;
    this.activeColorStop = null;
    this.firstPoint = null;
    this.eventBus.emit("workarea:update");
  }

  public onMouseMove({ offsetX, offsetY, shiftKey }: MouseEvent): void {
    const mousePosition = new Vector({ x: offsetX, y: offsetY });
    if (
      this.firstPoint &&
      !this.isDraggingEndPoints &&
      !this.isDraggingColorStop
    ) {
      const distance = mousePosition.distance(this.firstPoint);

      if (distance > Tool.DRAGGING_DISTANCE) {
        if (!this.activeGradientElement && this.isCreating) {
          this.eventBus.emit("edit:gradient", {
            position: this.firstPoint,
          });
          this.selectActiveGradient();
          this.startPosition = this.firstPoint;
          this.endPosition = mousePosition;
          this.modifyGradientPoints();
          this.isCreating = false;
          this.eventBus.emit("workarea:update");
        } else if (!this.isHoveringEnd || !this.isHoveringStart) {
          this.startPosition = this.firstPoint;
          this.endPosition = mousePosition;
          this.modifyGradientPoints();
        }
      }
    }

    // Hovering Points Logic
    if (this.startPosition && this.endPosition) {
      this.isHoveringEnd = mousePosition.distance(this.endPosition) < 10;
      this.isHoveringStart =
        !this.isHoveringEnd && mousePosition.distance(this.startPosition) < 10;

      if (this.colorsStops) {
        for (let i = 1; i < this.colorsStops.length - 1; i++) {
          const cs = this.colorsStops[i];
          const colorStopPos = {
            x: linearInterpolation(
              this.startPosition.x,
              this.endPosition.x,
              cs.portion,
            ),
            y: linearInterpolation(
              this.startPosition.y,
              this.endPosition.y,
              cs.portion,
            ),
          };
          if (mousePosition.distance(colorStopPos) < 30) {
            this.activeColorStop = i;
            break;
          }
          this.activeColorStop = null;
        }
      }
    }

    // Dragging Points Logic
    if (this.isDraggingEndPoints) {
      if (this.isHoveringStart) {
        if (this.endPosition) {
          const isBoundToX =
            shiftKey && Math.abs(offsetX - this.endPosition.x) < 40;
          const isBoundToY =
            shiftKey && Math.abs(offsetY - this.endPosition.y) < 40;
          this.startPosition = {
            x: isBoundToX ? this.endPosition.x : offsetX,
            y: isBoundToY ? this.endPosition.y : offsetY,
          };
        }
      }
      if (this.isHoveringEnd) {
        if (this.startPosition) {
          const isBoundToX =
            shiftKey && Math.abs(offsetX - this.startPosition.x) < 40;
          const isBoundToY =
            shiftKey && Math.abs(offsetY - this.startPosition.y) < 40;
          this.endPosition = {
            x: isBoundToX ? this.startPosition.x : offsetX,
            y: isBoundToY ? this.startPosition.y : offsetY,
          };
        }
      }
      this.modifyGradientPoints();
    } else if (
      this.isDraggingColorStop &&
      this.activeColorStop !== null &&
      this.startPosition &&
      this.endPosition
    ) {
      const vector = new Vector(this.endPosition).sub(this.startPosition);
      const mouseVec = mousePosition.sub(this.startPosition);
      let newPortion = clamp(mouseVec.dot(vector) / vector.magnitudeSq(), 0, 1);

      if (this.activeGradientElement) {
        const { colorStops } = this.activeGradientElement;
        const prevPortion = colorStops[this.activeColorStop - 1].portion;
        const nextPortion = colorStops[this.activeColorStop + 1].portion;

        newPortion = clamp(newPortion, prevPortion + 0.01, nextPortion - 0.01);

        this.activeGradientElement.colorStops[this.activeColorStop].portion =
          newPortion;
        this.activeGradientElement.sortColorStops();
        this.eventBus.emit("edit:gradientUpdateColorStops");
      }
    }
    this.eventBus.emit("workarea:update");
  }

  private selectActiveGradient = (): void => {
    const [selectedElements] = this.eventBus.request("workarea:selected:get");
    if (
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
      this.eventBus.emit("workarea:update");
    }
  };

  private modifyGradientPoints = (): void => {
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
      this.colorsStops = this.activeGradientElement.colorStops;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyUp(): void {}
}
