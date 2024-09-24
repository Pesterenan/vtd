export abstract class Tool {
  protected canvas: HTMLCanvasElement;
  protected context: CanvasRenderingContext2D | null;
  protected onMouseDown: (evt: MouseEvent) => void;
  protected onMouseMove: (evt: MouseEvent) => void;
  protected onMouseUp: (evt: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");

    this.onMouseDown = this.handleMouseDown.bind(this);
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onMouseUp = this.handleMouseUp.bind(this);
  }

  equipTool(): void {
    this.canvas.addEventListener("mousedown", this.onMouseDown);
  }
  unequipTool(): void {
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);
  }
  abstract draw(): void;
  abstract handleMouseDown(event: MouseEvent): void;
  abstract handleMouseUp(event: MouseEvent): void;
  abstract handleMouseMove(event: MouseEvent): void;
  abstract handleKeyDown(event: KeyboardEvent): void;
  abstract handleKeyUp(event: KeyboardEvent): void;
}
