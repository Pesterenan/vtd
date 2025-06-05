import { TextElement } from "src/components/elements/textElement";
import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "src/components/types";
import { WorkArea } from "src/components/workArea";
import EVENT, { dispatch } from "src/utils/customEvents";

export class TextTool extends Tool {
  private lastPosition: Position | null = null;

  equipTool(): void {
    super.equipTool();
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  unequipTool(): void {
    super.unequipTool();
    this.lastPosition = null;
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  draw(): void {
    if (this.context && this.lastPosition) {
      this.context.save();
      this.context.font = "bold 16px Times New Roman";
      this.context.fillStyle = "black";
      this.context.strokeStyle = "#FFFFFF";
      this.context.lineWidth = 2;
      this.context.strokeText("T|", this.lastPosition.x, this.lastPosition.y);
      this.context.fillText("T|", this.lastPosition.x, this.lastPosition.y);
      this.context.restore();
    }
  }

  handleMouseDown(evt: MouseEvent): void {
    const workArea = WorkArea.getInstance();
    const { offsetX, offsetY } = evt;
    const selection = { x: offsetX, y: offsetY };
    workArea.selectElements(selection);
    const elements = workArea.getSelectedElements();
    if (!elements || !(elements[0] instanceof TextElement)) {
      workArea.addTextElement({ x: evt.offsetX, y: evt.offsetY });
      workArea.selectElements(selection);
    }
  }

  handleMouseMove(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    this.lastPosition = { x: offsetX, y: offsetY };
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  handleKeyDown(evt: KeyboardEvent): void {
    if ((evt.shiftKey && evt.key === "Enter") || evt.key === "Escape") {
      evt.preventDefault();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
