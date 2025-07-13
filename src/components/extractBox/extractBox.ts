import { clamp } from "src/utils/easing";
import type { EventBus } from "src/utils/eventBus";
import type { Position, Size, TBoundingBox } from "../types";

const LINE_WIDTH = 4;
const CENTER_RADIUS = 6;
const FRAME_RATIO: Record<string, number> = {
  vertical_wide: 1.77,
  horizontal_wide: 0.5625,
  letterbox: 1.33,
} as const;

export class ExtractBox {
  private position: Position = { x: 0, y: 0 };
  public size: Size = { width: 0, height: 0 };
  private canvas: HTMLCanvasElement;
  private isDragging = false;
  private lastMousePosition: Position | null = { x: 0, y: 0 };
  private eventBus: EventBus;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.setupInitialBox();
    this.draw();
  }

  public getBoundingBox(): TBoundingBox {
    return {
      x1: this.position.x,
      y1: this.position.y,
      x2: this.size.width,
      y2: this.size.height,
    };
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
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
  }

  private onMouseMove(evt: MouseEvent): void {
    if (this.isDragging && this.lastMousePosition) {
      const dX = evt.offsetX - this.lastMousePosition.x;
      const dY = evt.offsetY - this.lastMousePosition.y;
      this.moveExtractBox(dX, dY);
      this.lastMousePosition = { x: evt.offsetX, y: evt.offsetY };
      this.eventBus.emit("vfe:update");
    }
  }

  private moveExtractBox(deltaX: number, deltaY: number): void {
    this.position.x += deltaX;
    this.position.y += deltaY;

    // Garantir que a caixa não vá além dos limites do canvas
    this.position.x = clamp(
      this.position.x,
      0,
      this.canvas.width - this.size.width,
    );
    this.position.y = clamp(
      this.position.y,
      0,
      this.canvas.height - this.size.height,
    );
  }

  private setupInitialBox(): void {
    const ratio = FRAME_RATIO.horizontal_wide;
    let width = this.canvas.width;
    let height = Math.ceil(this.canvas.width * ratio);
    if (height > this.canvas.height) {
      height = this.canvas.height;
      width = Math.ceil(this.canvas.height / ratio);
    }
    this.position = {
      x: this.canvas.width * 0.5 - width * 0.5,
      y: this.canvas.height * 0.5 - height * 0.5,
    };
    this.size = { height, width };
  }

  /** Returns the center of the transform box */
  public getCenter(): Position {
    return {
      x: this.position.x + this.size.width * 0.5,
      y: this.position.y + this.size.height * 0.5,
    };
  }

  public draw(): void {
    const context = this.canvas.getContext("2d");
    if (!context) return;
    const centerPosition = this.getCenter();

    // Draw extracting box
    context.save();
    context.strokeStyle = "green";
    context.lineWidth = LINE_WIDTH;
    context.strokeRect(
      this.position.x + LINE_WIDTH * 0.5,
      this.position.y + LINE_WIDTH * 0.5,
      this.size.width - LINE_WIDTH,
      this.size.height - LINE_WIDTH,
    );

    // Draw centerHandle
    context.fillStyle = "green";
    context.beginPath();
    context.arc(
      centerPosition.x,
      centerPosition.y,
      CENTER_RADIUS,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.closePath();
    context.restore();
  }
}
