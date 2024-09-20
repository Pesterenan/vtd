import EVENT from '../../utils/customEvents';
import { BoundingBox, Position, Size } from '../types';

const LINE_WIDTH = 8;
const CENTER_RADIUS = 10;
const FRAME_RATIO: Record<string, number> = {
  vertical_wide: 1.77,
  horizontal_wide: 0.5625,
  letterbox: 1.33
};

export class ExtractBox {
  private position: Position = { x: 0, y: 0 };
  public size: Size = { width: 0, height: 0 };
  private canvas: HTMLCanvasElement;
  private isDragging: boolean = false;
  private lastMousePosition: Position | null = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupInitialBox();
    this.draw();
  }

  public getBoundingBox(): BoundingBox {
    return { x1: this.position.x, y1: this.position.y, x2: this.size.width, y2: this.size.height };
  }

  public onClick(evt: MouseEvent): void {
    const { offsetX: x, offsetY: y } = evt;
    const centerPosition = this.getCenter();
    if (
      x > centerPosition.x - CENTER_RADIUS &&
      x < centerPosition.x + CENTER_RADIUS &&
      y > centerPosition.y - CENTER_RADIUS &&
      y < centerPosition.y + CENTER_RADIUS
    ) {
      this.isDragging = true;
      this.lastMousePosition = { x, y };
      const onMouseMove = (evt: MouseEvent): void => this.onMouseMove(evt);
      const onMouseUp = (): void => {
        this.isDragging = false;
        this.lastMousePosition = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
  }

  private onMouseMove(evt: MouseEvent): void {
    if (this.isDragging && this.lastMousePosition) {
      const dX = evt.offsetX - this.lastMousePosition.x;
      const dY = evt.offsetY - this.lastMousePosition.y;
      this.moveExtractBox(dX, dY);
      this.lastMousePosition = { x: evt.offsetX, y: evt.offsetY };
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_VFE));
    }
  }

  private moveExtractBox(deltaX: number, deltaY: number): void {
    this.position.x += deltaX;
    this.position.y += deltaY;

    // Garantir que a caixa não vá além dos limites do canvas
    this.position.x = Math.max(0, Math.min(this.canvas.width - this.size.width, this.position.x));
    this.position.y = Math.max(0, Math.min(this.canvas.height - this.size.height, this.position.y));
  }

  private setupInitialBox(): void {
    const ratio = FRAME_RATIO['horizontal_wide'];
    let width = this.canvas.width;
    let height = Math.ceil(this.canvas.width * ratio);
    if (height > this.canvas.height) {
      height = this.canvas.height;
      width = Math.ceil(this.canvas.height / ratio);
    }
    this.position = {
      x: this.canvas.width * 0.5 - width * 0.5,
      y: this.canvas.height * 0.5 - height * 0.5
    };
    this.size = { height, width };
    console.log(this.size);
  }

  /** Returns the center of the transform box */
  public getCenter(): Position {
    return {
      x: this.position.x + this.size.width * 0.5,
      y: this.position.y + this.size.height * 0.5
    };
  }

  public draw(): void {
    const context = this.canvas.getContext('2d')!;
    if (!context) return;
    const centerPosition = this.getCenter();

    // Draw extracting box
    context.save();
    context.strokeStyle = 'green';
    context.lineWidth = LINE_WIDTH;
    context.strokeRect(
      this.position.x + LINE_WIDTH * 0.5,
      this.position.y + LINE_WIDTH * 0.5,
      this.size.width - LINE_WIDTH,
      this.size.height - LINE_WIDTH
    );

    // Draw centerHandle
    context.fillStyle = 'green';
    context.beginPath();
    context.arc(centerPosition.x, centerPosition.y, CENTER_RADIUS, 0, Math.PI * 2);
    context.fill();
    context.closePath();
    context.restore();
  }
}
