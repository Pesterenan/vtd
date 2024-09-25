import EVENT from "../../utils/customEvents";
import { TextElement } from "../textElement";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";

export class TextTool extends Tool {
  private activeTextElement: TextElement | null = null;
  private currentText = "";

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  equipTool(): void {
    super.equipTool();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  unequipTool(): void {
    super.unequipTool();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  draw(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(evt: MouseEvent): void {
    const workArea = WorkArea.getInstance();
    const { offsetX, offsetY } = evt;
    const selection = { x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY };

    workArea.selectElements(selection);
    const element = workArea.getSelectedElements();
    if (element && element[0] instanceof TextElement) {
      this.activeTextElement = element[0];
      this.currentText = this.activeTextElement.content;
      console.log("is text");
      window.addEventListener("keydown", this.onKeyDown);
      //this.createInputField();
    } else {
      console.log("is not text");
      //this.finishEditing();
    }
  }

  handleTextInput(): void {
    if (this.activeTextElement) {
      this.activeTextElement.content = this.currentText;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseUp(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseMove(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(evt: KeyboardEvent): void {
    console.log(evt.key);
    if (evt.key === "Enter") {
      console.log("Enter");
      window.removeEventListener("keydown", this.onKeyDown);
    }
    if (/[aA-zZ]/.test(evt.key)) {
      this.currentText += evt.key;
      this.handleTextInput();
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
