import EVENT, { dispatch } from "src/utils/customEvents";
import type { Position } from "src/components/types";
import { Tool } from "src/components/tools/abstractTool";
import { WorkArea } from "src/components/workArea";
import { GradientElement } from "src/components/elements/gradientElement";
import { BB } from "src/utils/bb";

export class GradientTool extends Tool {
  private activeGradientElement: GradientElement | null = null;
  private isCreating = false;
  private isDragging = false;
  private isHoveringEndPos = false;
  private isHoveringStartPos = false;
  private startPosition: Position | null = null;
  private endPosition: Position | null = null;
  private onHover: ((evt: MouseEvent) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  equipTool(): void {
    super.equipTool();
    this.resetTool();
    this.onHover = ({ offsetX, offsetY }: MouseEvent) => {
      if (this.startPosition && this.endPosition) {
        const mousePosition = { x: offsetX, y: offsetY };
        const startPosBB = new BB(this.startPosition, 20);
        const endPosBB = new BB(this.endPosition, 20);
        this.isHoveringEndPos = endPosBB.isPointWithinBB(mousePosition);
        this.isHoveringStartPos =
          !this.isHoveringEndPos && startPosBB.isPointWithinBB(mousePosition);
        dispatch(EVENT.UPDATE_WORKAREA);
      }
    };
    this.canvas.addEventListener("mousemove", this.onHover);
    this.selectActiveGradient();
    window.addEventListener(EVENT.SELECT_ELEMENT, () => {
      this.resetTool();
      this.selectActiveGradient();
    });
  }

  unequipTool(): void {
    super.unequipTool();
    this.resetTool();
    if (this.onHover) {
      this.canvas.removeEventListener("mousemove", this.onHover);
    }
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  resetTool(): void {
    this.startPosition = null;
    this.endPosition = null;
    this.activeGradientElement = null;
    this.isCreating = false;
    this.isDragging = false;
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  draw(): void {
    if (this.startPosition && this.endPosition && this.context) {
      const startRadius = this.isHoveringStartPos ? 4 : 2;
      const endRadius = this.isHoveringEndPos ? 4 : 2;
      this.context.save();
      this.context.fillStyle = "#FFFFFF";
      this.context.beginPath();
      this.context.arc(
        this.startPosition.x,
        this.startPosition.y,
        8,
        0,
        Math.PI * 2,
      );
      this.context.fill();
      this.context.beginPath();
      this.context.arc(
        this.endPosition.x,
        this.endPosition.y,
        8,
        0,
        Math.PI * 2,
      );
      this.context.fill();
      this.context.fillStyle = "#777777";
      this.context.beginPath();
      this.context.arc(
        this.startPosition.x,
        this.startPosition.y,
        6,
        0,
        Math.PI * 2,
      );
      this.context.fill();
      this.context.beginPath();
      this.context.arc(
        this.endPosition.x,
        this.endPosition.y,
        6,
        0,
        Math.PI * 2,
      );
      this.context.fill();

      this.context.fillStyle = "#000000";
      this.context.beginPath();
      this.context.arc(
        this.startPosition.x,
        this.startPosition.y,
        startRadius,
        0,
        Math.PI * 2,
      );
      this.context.fill();
      this.context.beginPath();
      this.context.fillStyle = "#FFFFFF";
      this.context.arc(
        this.endPosition.x,
        this.endPosition.y,
        endRadius,
        0,
        Math.PI * 2,
      );
      this.context.fill();
      this.context.restore();
    }
  }

  handleMouseDown({ offsetX, offsetY }: MouseEvent): void {
    if (this.activeGradientElement === null) {
      this.isCreating = true;
      WorkArea.getInstance().addGradientElement();
      WorkArea.getInstance().selectElements({
        x: offsetX,
        y: offsetY,
      });
      this.selectActiveGradient();
    }
    if (!this.isHoveringStartPos && !this.isHoveringEndPos) {
      this.startPosition = { x: offsetX, y: offsetY };
      this.endPosition = { x: offsetX, y: offsetY };
    }
    this.isDragging = true;
    super.handleMouseDown();
  }

  handleMouseUp({ offsetX, offsetY }: MouseEvent): void {
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
    super.handleMouseUp();
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  handleMouseMove({ offsetX, offsetY, shiftKey }: MouseEvent): void {
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
  }

  private selectActiveGradient(): void {
    const selectedElements = WorkArea.getInstance().getSelectedElements();
    if (
      selectedElements &&
      selectedElements.length === 1 &&
      selectedElements[0] instanceof GradientElement
    ) {
      this.activeGradientElement = selectedElements[0];
      this.startPosition = WorkArea.getInstance().adjustForScreen(
        this.activeGradientElement.startPosition,
      );
      this.endPosition = WorkArea.getInstance().adjustForScreen(
        this.activeGradientElement.endPosition,
      );
      this.isCreating = false;
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  }

  private modifyGradientPoints(): void {
    if (this.activeGradientElement === null) return;
    const workArea = WorkArea.getInstance();
    if (this.startPosition && this.endPosition) {
      this.activeGradientElement.startPosition = workArea.adjustForCanvas(
        this.startPosition,
      );
      this.activeGradientElement.endPosition = workArea.adjustForCanvas(
        this.endPosition,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
