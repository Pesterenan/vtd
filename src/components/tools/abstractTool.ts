export abstract class Tool {
  protected canvas: HTMLCanvasElement;
  protected context: CanvasRenderingContext2D | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  abstract equipTool(): void;
  abstract unequipTool(): void;
  abstract draw(): void;
  abstract handleMouseDown(event: MouseEvent): void;
  abstract handleMouseUp(event: MouseEvent): void;
  abstract handleMouseMove(event: MouseEvent): void;
  abstract handleKeyDown(event: KeyboardEvent): void;
  abstract handleKeyUp(event: KeyboardEvent): void;
}
