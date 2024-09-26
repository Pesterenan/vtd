import EVENT from "../../utils/customEvents";
import { TextElement } from "../textElement";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";

export class TextTool extends Tool {
  private activeTextElement: TextElement | null = null;
  private textInput: HTMLTextAreaElement | null = null;
  private onTextInput: (evt: Event) => void;
  private currentText = [""];

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.onTextInput = this.handleTextInput.bind(this);
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
      this.createInputField();
    } else {
      console.log("is not text");
      //this.finishEditing();
    }
  }

  createInputField(): void {
    this.textInput = document.createElement("textarea");
    this.textInput.inputMode = "text";

    this.textInput.style.display = "block";
    this.textInput.style.position = "absolute";
    this.textInput.style.border = "none";
    this.textInput.style.background = "transparent";
    this.textInput.style.resize = "none";
    if (this.activeTextElement) {
      this.textInput.value = this.activeTextElement.content.join("\n");
      this.textInput.style.left = `20px`;
      this.textInput.style.top = `20px`;
      this.textInput.style.fontSize = `2rem`;
      this.textInput.style.fontFamily = this.activeTextElement.font;
      this.textInput.style.color = this.activeTextElement.fillColor;
    }

    // Adicionar à DOM
    document.body.appendChild(this.textInput);
    this.textInput.focus();

    // Lidar com mudança de texto
    this.textInput.addEventListener("input", this.onTextInput);
  }

  handleTextInput(): void {
    if (this.activeTextElement && this.textInput) {
      this.activeTextElement.content = this.textInput.value.split("\n");
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseUp(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseMove(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
