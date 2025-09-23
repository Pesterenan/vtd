import { clamp } from "src/utils/easing";
import type { EventBus } from "src/utils/eventBus";
import type { Position, Size, TBoundingBox } from "../types";

const LINE_WIDTH = 4;
const CENTER_RADIUS = 6;

export type ExtractBoxHandleKeys =
  | "BOTTOM"
  | "BOTTOM_LEFT"
  | "BOTTOM_RIGHT"
  | "CENTER"
  | "LEFT"
  | "RIGHT"
  | "TOP"
  | "TOP_LEFT"
  | "TOP_RIGHT";

export class ExtractBox {
  private position: Position = { x: 0, y: 0 };
  public size: Size = { width: 0, height: 0 };
  private canvas: HTMLCanvasElement;
  private isDragging = false;
  private lastMousePosition: Position | null = { x: 0, y: 0 };
  private eventBus: EventBus;

  public handles: Record<ExtractBoxHandleKeys, Position> | null = null;
  public hoveredHandle: ExtractBoxHandleKeys | null = null;
  public selectedHandle: ExtractBoxHandleKeys | null = null;
  private aspectRatio: number | null = null;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.setupInitialBox();
    this.generateHandles();
    this.draw();
  }

  public setAspectRatio(ratioString: string): void {
    if (ratioString === "custom") {
      this.aspectRatio = null;
      return;
    }

    const [width, height] = ratioString.split(":").map(Number);
    this.aspectRatio = width / height;

    let newWidth = this.canvas.width;
    let newHeight = newWidth / this.aspectRatio;

    if (newHeight > this.canvas.height) {
      newHeight = this.canvas.height;
      newWidth = newHeight * this.aspectRatio;
    }

    this.size = { width: newWidth, height: newHeight };
    this.position = {
      x: (this.canvas.width - newWidth) / 2,
      y: (this.canvas.height - newHeight) / 2,
    };

    this.generateHandles();
    this.eventBus.emit("vfe:update");
  }

  public getBoundingBox(): TBoundingBox {
    return {
      x1: this.position.x,
      y1: this.position.y,
      x2: this.size.width,
      y2: this.size.height,
    };
  }

  public onMouseDown(evt: MouseEvent): void {
    this.hoverHandle(evt);
    this.selectHandle();

    if (!this.selectedHandle) return;

    this.isDragging = true;
    const canvasRect = this.canvas.getBoundingClientRect();
    this.lastMousePosition = {
      x: evt.clientX - canvasRect.left,
      y: evt.clientY - canvasRect.top,
    };

    const onMouseMove = (e: MouseEvent): void => this.onMouseMove(e);
    const onMouseUp = (): void => {
      this.isDragging = false;
      this.lastMousePosition = null;
      this.selectedHandle = null;
      this.hoveredHandle = null;
      this.eventBus.emit("vfe:update");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  private onMouseMove(evt: MouseEvent): void {
    if (!this.isDragging || !this.lastMousePosition) return;

    const canvasRect = this.canvas.getBoundingClientRect();
    const mouseX = evt.clientX - canvasRect.left;
    const mouseY = evt.clientY - canvasRect.top;

    const dX = mouseX - this.lastMousePosition.x;
    const dY = mouseY - this.lastMousePosition.y;

    if (this.selectedHandle === "CENTER") {
      this.moveExtractBox(dX, dY);
    } else if (this.selectedHandle) {
      this.resizeExtractBox(dX, dY);
    }

    this.lastMousePosition = { x: mouseX, y: mouseY };
    this.eventBus.emit("vfe:update");
  }

  private resizeExtractBox(deltaX: number, deltaY: number): void {
    const { xSign, ySign } = this.calculateSignAndAnchor();

    let newWidth = this.size.width + deltaX * xSign;
    let newHeight = this.size.height + deltaY * ySign;

    if (this.aspectRatio) {
      if (xSign !== 0 && ySign !== 0) {
        // Corner handles: maintain aspect ratio based on the larger delta direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          newHeight = newWidth / this.aspectRatio;
        } else {
          newWidth = newHeight * this.aspectRatio;
        }
      } else if (xSign !== 0) {
        // Horizontal handles
        newHeight = newWidth / this.aspectRatio;
      } else if (ySign !== 0) {
        // Vertical handles
        newWidth = newHeight * this.aspectRatio;
      }
    }

    const minSize = 10;
    if (newWidth < minSize) {
      newWidth = minSize;
      if (this.aspectRatio) newHeight = newWidth / this.aspectRatio;
    }
    if (newHeight < minSize) {
      newHeight = minSize;
      if (this.aspectRatio) newWidth = newHeight * this.aspectRatio;
    }

    if (xSign < 0) {
      this.position.x -= newWidth - this.size.width;
    }
    if (ySign < 0) {
      this.position.y -= newHeight - this.size.height;
    }

    this.size.width = newWidth;
    this.size.height = newHeight;

    // Clamp to canvas boundaries
    this.position.x = clamp(this.position.x, 0, this.canvas.width - this.size.width);
    this.position.y = clamp(this.position.y, 0, this.canvas.height - this.size.height);
    this.size.width = clamp(this.size.width, minSize, this.canvas.width - this.position.x);
    this.size.height = clamp(this.size.height, minSize, this.canvas.height - this.position.y);

    this.generateHandles();
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
    this.generateHandles();
  }

  private setupInitialBox(): void {
    this.size = { width: this.canvas.width, height: this.canvas.height };
    this.position = { x: 0, y: 0 };
  }

  public getCenter(): Position {
    return {
      x: this.position.x + this.size.width * 0.5,
      y: this.position.y + this.size.height * 0.5,
    };
  }

  private generateHandles(): void {
    const { x, y } = this.position;
    const { width, height } = this.size;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    this.handles = {
      TOP_LEFT: { x, y },
      TOP: { x: x + halfWidth, y },
      TOP_RIGHT: { x: x + width, y },
      RIGHT: { x: x + width, y: y + halfHeight },
      BOTTOM_RIGHT: { x: x + width, y: y + height },
      BOTTOM: { x: x + halfWidth, y: y + height },
      BOTTOM_LEFT: { x, y: y + height },
      LEFT: { x, y: y + halfHeight },
      CENTER: { x: x + halfWidth, y: y + halfHeight },
    };
  }

  public draw(): void {
    const context = this.canvas.getContext("2d");
    if (!context) return;

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

    // Draw handles
    if (this.handles) {
      for (const key of Object.keys(this.handles) as ExtractBoxHandleKeys[]) {
        const point = this.handles[key];
        context.fillStyle = key === this.hoveredHandle ? "yellow" : "green";
        context.beginPath();
        context.arc(point.x, point.y, CENTER_RADIUS, 0, Math.PI * 2);
        context.fill();
        context.closePath();
      }
    }
    context.restore();
  }

  public hoverHandle(evt: MouseEvent): void {
    if (this.handles) {
      const { offsetX, offsetY } = evt;
      const hitHandle = (
        Object.keys(this.handles) as ExtractBoxHandleKeys[]
      ).find((key) => {
        if (this.handles) {
          const point = this.handles[key];
          return Math.hypot(offsetX - point.x, offsetY - point.y) < 10;
        }
        return false;
      });
      this.hoveredHandle = hitHandle || null;
      this.eventBus.emit("vfe:update");
    }
  }

  private selectHandle(): boolean {
    this.selectedHandle = this.hoveredHandle;
    return !!this.hoveredHandle;
  }

  private calculateSignAndAnchor(): {
    anchor: Position;
    xSign: 1 | 0 | -1;
    ySign: 1 | 0 | -1;
  } {
    let anchor: Position = { x: 0, y: 0 };
    let xSign: 1 | 0 | -1 = 1;
    let ySign: 1 | 0 | -1 = 1;

    if (!this.handles || !this.selectedHandle) return { anchor, xSign, ySign };

    switch (this.selectedHandle) {
      case "TOP_LEFT":
        xSign = -1;
        ySign = -1;
        anchor = this.handles.BOTTOM_RIGHT;
        break;
      case "TOP_RIGHT":
        xSign = 1;
        ySign = -1;
        anchor = this.handles.BOTTOM_LEFT;
        break;
      case "BOTTOM_RIGHT":
        xSign = 1;
        ySign = 1;
        anchor = this.handles.TOP_LEFT;
        break;
      case "BOTTOM_LEFT":
        xSign = -1;
        ySign = 1;
        anchor = this.handles.TOP_RIGHT;
        break;
      case "TOP":
        xSign = 0;
        ySign = -1;
        anchor = this.handles.BOTTOM;
        break;
      case "RIGHT":
        xSign = 1;
        ySign = 0;
        anchor = this.handles.LEFT;
        break;
      case "BOTTOM":
        xSign = 0;
        ySign = 1;
        anchor = this.handles.TOP;
        break;
      case "LEFT":
        xSign = -1;
        ySign = 0;
        anchor = this.handles.RIGHT;
        break;
      case "CENTER":
        xSign = 0;
        ySign = 0;
        anchor = this.handles.CENTER;
        break;
    }
    return { anchor, xSign, ySign };
  }
}
