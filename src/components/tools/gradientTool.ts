import EVENT from "../../utils/customEvents";
import { Position } from "../types";
import { Tool } from "./abstractTool";
import centerHandleScale from "../../components/transformBox/assets/centerHandleScale.svg";
import { WorkArea } from "../workArea";
import { GradientElement } from "../gradientElement";

export class GradientTool extends Tool {
  private startPosition: Position | null = null;
  private endPosition: Position | null = null;
  private toolIcon: HTMLImageElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.toolIcon = new Image(12, 12);
    this.toolIcon.src = centerHandleScale;
  }

  equipTool(): void {
    super.equipTool();
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  unequipTool(): void {
    super.unequipTool();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  draw(): void {
    if (
      this.startPosition &&
      this.endPosition &&
      this.context &&
      this.toolIcon
    ) {
      this.context.save();
      this.context.drawImage(
        this.toolIcon,
        this.startPosition.x - this.toolIcon.width * 0.5,
        this.startPosition.y - this.toolIcon.height * 0.5,
        this.toolIcon.width,
        this.toolIcon.height,
      );
      this.context.drawImage(
        this.toolIcon,
        this.endPosition.x - this.toolIcon.width * 0.5,
        this.endPosition.y - this.toolIcon.height * 0.5,
        this.toolIcon.width,
        this.toolIcon.height,
      );
      this.context.restore();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(evt: MouseEvent): void {
    this.startPosition = null;
    this.endPosition = null;
    this.startPosition = { x: evt.offsetX, y: evt.offsetY };
    super.handleMouseDown();
  }

  handleMouseUp(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    this.endPosition = { x: offsetX, y: offsetY };

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
        const offset = workArea.offset;
        gradientElement.startPosition = workArea.adjustForZoom({
          x: this.startPosition.x - offset.x,
          y: this.startPosition.y - offset.y,
        });
        gradientElement.endPosition = workArea.adjustForZoom({
          x: this.endPosition.x - offset.x,
          y: this.endPosition.y - offset.y,
        });
      }
    }
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseMove(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
