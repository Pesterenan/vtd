import EVENT from "../../utils/customEvents";
import { TextElement } from "../textElement";
import { Position } from "../types";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";

export class TextTool extends Tool {
  private lastPosition: Position | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  equipTool(): void {
    super.equipTool();
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  unequipTool(): void {
    super.unequipTool();
    this.lastPosition = null;
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  draw(): void {
    if (this.context && this.lastPosition) {
      this.context.save();
      this.context.font = "bold 16px Times New Roman";
      this.context.fillStyle = "black";
      this.context.fillText("T|", this.lastPosition.x, this.lastPosition.y);
      this.context.restore();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(evt: MouseEvent): void {
    const workArea = WorkArea.getInstance();
    const { offsetX, offsetY } = evt;
    const selection = { x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY };
    workArea.selectElements(selection);
    const elements = workArea.getSelectedElements();
    if (!elements || !(elements[0] instanceof TextElement)) {
      console.log("creating text");
      workArea.addTextElement({ x: evt.offsetX, y: evt.offsetY });
      workArea.selectElements(selection);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseMove(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    this.lastPosition = { x: offsetX, y: offsetY };
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(evt: KeyboardEvent): void {
    if ((evt.shiftKey && evt.key === "Enter") || evt.key === "Escape") {
      evt.preventDefault();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
