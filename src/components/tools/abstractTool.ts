import EVENT from "src/utils/customEvents";

export abstract class Tool {
  protected canvas: HTMLCanvasElement;
  protected context: CanvasRenderingContext2D | null;
  protected onMouseDown: (evt: MouseEvent) => void;
  protected onMouseMove: (evt: MouseEvent) => void;
  protected onMouseUp: (evt: MouseEvent) => void;
  protected onKeyDown: (evt: KeyboardEvent) => void;
  protected onKeyUp: (evt: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");

    this.onMouseDown = this.handleMouseDown.bind(this);
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onMouseUp = this.handleMouseUp.bind(this);
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
  }

  abstract draw(): void;
  equipTool(): void {
    this.canvas.addEventListener("mousedown", this.onMouseDown);
  }
  unequipTool(): void {
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleMouseDown(_evt?: MouseEvent): void {
    window.dispatchEvent(new CustomEvent(EVENT.USING_TOOL, { detail: { isUsingTool: true } }));
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mouseup", this.onMouseUp);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleMouseUp(_evt?: MouseEvent): void {
    window.dispatchEvent(new CustomEvent(EVENT.USING_TOOL, { detail: { isUsingTool: false } }));
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);
  }
  abstract handleMouseMove(evt: MouseEvent): void;
  abstract handleKeyDown(evt: KeyboardEvent): void;
  abstract handleKeyUp(evt: KeyboardEvent): void;
}
