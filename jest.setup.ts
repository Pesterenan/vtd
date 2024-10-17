global.OffscreenCanvas = class {
  width: number;
  height: number;
  private canvas: HTMLCanvasElement;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getContext(contextId: '2d', options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null {
    return this.canvas.getContext(contextId, options) as CanvasRenderingContext2D | null;
  }
} as unknown as typeof OffscreenCanvas;
