import EVENT from "../../utils/customEvents";
import { TextElement } from "../textElement";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";

export class TextTool extends Tool {
  private activeTextElement: TextElement | null = null;
  private textMenu: HTMLDivElement | null = null;
  private textInput: HTMLTextAreaElement | null = null;
  private fontSizeInput: HTMLInputElement | null = null;
  private fillColorInput: HTMLInputElement | null = null;
  private strokeColorInput: HTMLInputElement | null = null;
  private onTextInput: (evt: Event) => void;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.onTextInput = this.handleTextInput.bind(this);
    this.handleFontSizeChange = this.handleFontSizeChange.bind(this);
    this.handleFillColorChange = this.handleFillColorChange.bind(this);
    this.handleStrokeColorChange = this.handleStrokeColorChange.bind(this);
    this.acceptChanges = this.acceptChanges.bind(this);
    this.cancelChanges = this.cancelChanges.bind(this);
  }

  equipTool(): void {
    super.equipTool();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  unequipTool(): void {
    super.unequipTool();
    this.finishEditing();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  draw(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(evt: MouseEvent): void {
    const workArea = WorkArea.getInstance();
    const { offsetX, offsetY } = evt;
    const selection = { x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY };

    workArea.selectElements(selection);
    let element = workArea.getSelectedElements();
    if (!element || !(element[0] instanceof TextElement)) {
      console.log("creating text");
      this.finishEditing();
      workArea.addTextElement({ x: evt.offsetX, y: evt.offsetY });
      workArea.selectElements(selection);
      element = workArea.getSelectedElements();
    }
    if (element && element[0] instanceof TextElement) {
      this.activeTextElement = element[0];
      console.log("editing text");
      this.showTextMenu();
    } else {
      console.log("is not text");
      this.finishEditing();
    }
  }

  showTextMenu(): void {
    this.finishEditing();

    this.textMenu = document.createElement("div");
    this.textMenu.style.position = "fixed";
    this.textMenu.style.top = "50px";
    this.textMenu.style.left = "50px";
    this.textMenu.style.padding = "10px";
    this.textMenu.style.backgroundColor = "#ffffff";
    this.textMenu.style.border = "1px solid #ccc";
    this.textMenu.style.display = "flex";
    this.textMenu.style.flexDirection = "column";
    this.textMenu.style.gap = "10px";

    this.textInput = document.createElement("textarea");
    this.textInput.value = this.activeTextElement?.content.join("\n") || "";
    this.textInput.id = "inp_text-tool";
    // Lidar com mudança de texto
    this.textInput.addEventListener("input", this.onTextInput);
    this.textInput.addEventListener("keydown", this.onKeyDown);
    this.textMenu.appendChild(this.textInput);

    // Input para mudar o tamanho da fonte
    this.fontSizeInput = document.createElement("input");
    this.fontSizeInput.type = "number";
    this.fontSizeInput.value =
      this.activeTextElement?.fontSize.toString() || "16";
    this.fontSizeInput.addEventListener("input", this.handleFontSizeChange);
    this.textMenu.appendChild(this.fontSizeInput);

    // Input para cor de preenchimento
    this.fillColorInput = document.createElement("input");
    this.fillColorInput.type = "color";
    this.fillColorInput.value = this.activeTextElement?.fillColor || "#000000";
    this.fillColorInput.addEventListener("input", this.handleFillColorChange);
    this.textMenu.appendChild(this.fillColorInput);

    // Input para cor da borda
    this.strokeColorInput = document.createElement("input");
    this.strokeColorInput.type = "color";
    this.strokeColorInput.value =
      this.activeTextElement?.strokeColor || "#000000";
    this.strokeColorInput.addEventListener(
      "input",
      this.handleStrokeColorChange,
    );
    this.textMenu.appendChild(this.strokeColorInput);

    // Botão de aceitar
    const acceptButton = document.createElement("button");
    acceptButton.innerText = "Aceitar";
    acceptButton.addEventListener("click", this.acceptChanges);
    this.textMenu.appendChild(acceptButton);

    // Botão de cancelar
    const cancelButton = document.createElement("button");
    cancelButton.innerText = "Cancelar";
    cancelButton.addEventListener("click", this.cancelChanges);
    this.textMenu.appendChild(cancelButton);

    // Adicionar o menu à DOM
    document.body.appendChild(this.textMenu);
  }

  finishEditing(): void {
    if (this.textMenu) {
      document.body.removeChild(this.textMenu);
      this.textMenu = null;
      this.textInput = null;
      this.activeTextElement = null;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  handleTextInput(): void {
    if (this.activeTextElement && this.textInput) {
      this.activeTextElement.content = this.textInput.value.split("\n");
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  handleFontSizeChange(evt: Event): void {
    if (this.activeTextElement && this.fontSizeInput) {
      this.activeTextElement.fontSize = parseInt(this.fontSizeInput.value, 10);
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  handleFillColorChange(evt: Event): void {
    if (this.activeTextElement && this.fillColorInput) {
      this.activeTextElement.fillColor = this.fillColorInput.value;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  handleStrokeColorChange(evt: Event): void {
    if (this.activeTextElement && this.strokeColorInput) {
      this.activeTextElement.strokeColor = this.strokeColorInput.value;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  acceptChanges(): void {
    this.finishEditing();
  }

  cancelChanges(): void {
    this.finishEditing();
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseUp(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseMove(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(evt: KeyboardEvent): void {
    if ((evt.shiftKey && evt.key === "Enter") || evt.key === "Escape") {
      evt.preventDefault();
      this.finishEditing();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
