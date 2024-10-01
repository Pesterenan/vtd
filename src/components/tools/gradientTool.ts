import EVENT from "../../utils/customEvents";
import { Position } from "../types";
import { Tool } from "./abstractTool";
import { WorkArea } from "../workArea";
import { GradientElement } from "../gradientElement";
import { BB } from "../../utils/bb";

export class GradientTool extends Tool {
  private startPosition: Position | null = null;
  private endPosition: Position | null = null;
  private onHover: ((evt: MouseEvent) => void) | null = null;
  private isDragging = false;
  private isHoveringStartPos = false;
  private isHoveringEndPos = false;
  private activeGradientElement: GradientElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  equipTool(): void {
    this.onHover = ({ offsetX, offsetY }: MouseEvent) => {
      if (this.startPosition && this.endPosition) {
        const mousePosition = { x: offsetX, y: offsetY };
        const startPosBB = new BB(this.startPosition, 20);
        const endPosBB = new BB(this.endPosition, 20);
        this.isHoveringEndPos = endPosBB.isPointWithinBB(mousePosition);
        this.isHoveringStartPos =
          !this.isHoveringEndPos && startPosBB.isPointWithinBB(mousePosition);
        window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      }
    };
    this.canvas.addEventListener("mousemove", this.onHover);
    super.equipTool();
    const workArea = WorkArea.getInstance();
    const elements = workArea.getSelectedElements();
    if (elements && elements[0] instanceof GradientElement) {
      console.log("elemento selecionado");
      this.activeGradientElement = elements[0];
      this.startPosition = workArea.adjustForScreen(
        this.activeGradientElement.startPosition,
      );
      this.endPosition = workArea.adjustForScreen(
        this.activeGradientElement.endPosition,
      );
    }
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  unequipTool(): void {
    super.unequipTool();
    this.startPosition = null;
    this.endPosition = null;
    this.activeGradientElement = null;
    if (this.onHover) {
      this.canvas.removeEventListener("mousemove", this.onHover);
    }
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
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

  handleMouseDown(evt: MouseEvent): void {
    if (!this.isHoveringStartPos && !this.isHoveringEndPos) {
      this.startPosition = { x: evt.offsetX, y: evt.offsetY };
      this.endPosition = null;
    }
    this.isDragging = true;
    super.handleMouseDown();
  }

  handleMouseUp({ offsetX, offsetY }: MouseEvent): void {
    if (!this.isHoveringStartPos && !this.isHoveringEndPos) {
      this.endPosition = { x: offsetX, y: offsetY };
    }
    this.isHoveringStartPos = false;
    this.isHoveringEndPos = false;

    this.isDragging = false;
    super.handleMouseUp();
    const workArea = WorkArea.getInstance();
    const selection = { x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY };
    workArea.selectElements(selection);
    const elements = workArea.getSelectedElements();
    if (!elements || !(elements[0] instanceof GradientElement)) {
      workArea.addGradientElement();
      workArea.selectElements(selection);
    }
    if (this.startPosition && this.endPosition) {
      const gradientElement =
        workArea.getSelectedElements()?.[0] as GradientElement;
      if (gradientElement) {
        gradientElement.startPosition = workArea.adjustForCanvas(
          this.startPosition,
        );
        gradientElement.endPosition = workArea.adjustForCanvas(
          this.endPosition,
        );
      }
    }
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  handleMouseMove({ offsetX, offsetY, shiftKey }: MouseEvent): void {
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
      const workArea = WorkArea.getInstance();
      if (this.startPosition && this.endPosition) {
        const gradientElement =
          workArea.getSelectedElements()?.[0] as GradientElement;
        if (gradientElement) {
          gradientElement.startPosition = workArea.adjustForCanvas(
            this.startPosition,
          );
          gradientElement.endPosition = workArea.adjustForCanvas(
            this.endPosition,
          );
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
