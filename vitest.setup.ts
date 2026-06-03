import "@testing-library/jest-dom";
import { vi } from "vitest";

function createMockContext(): CanvasRenderingContext2D {
  const mockTextMetrics: TextMetrics = {
    width: 100,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 100,
    actualBoundingBoxAscent: 50,
    actualBoundingBoxDescent: 10,
    fontBoundingBoxAscent: 50,
    fontBoundingBoxDescent: 10,
    alphabeticBaseline: 0,
    emHeightAscent: 50,
    emHeightDescent: 10,
    hangingBaseline: 0,
    ideographicBaseline: 0,
  };

  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    strokeRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    measureText: vi.fn(() => mockTextMetrics),
    setLineDash: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    clip: vi.fn(),
    rotate: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    canvas: {} as HTMLCanvasElement,
    direction: "ltr",
    fillStyle: "#000",
    filter: "none",
    font: "10px sans-serif",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "low",
    lineCap: "butt",
    lineDashOffset: 0,
    lineJoin: "miter",
    lineWidth: 1,
    miterLimit: 10,
    shadowBlur: 0,
    shadowColor: "rgba(0,0,0,0)",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    strokeStyle: "#000",
    textAlign: "start",
    textBaseline: "alphabetic",
    createLinearGradient: vi.fn(),
    createPattern: vi.fn(),
    createRadialGradient: vi.fn(),
    drawFocusIfNeeded: vi.fn(),
    drawImage: vi.fn(),
    ellipse: vi.fn(),
    getContextAttributes: vi.fn(),
    getImageData: vi.fn(),
    getLineDash: vi.fn(),
    getTransform: vi.fn(),
    isPointInPath: vi.fn(),
    isPointInStroke: vi.fn(),
    putImageData: vi.fn(),
    quadraticCurveTo: vi.fn(),
    rect: vi.fn(),
    resetTransform: vi.fn(),
    roundRect: vi.fn(),
    createConicGradient: vi.fn(),
    createImageData: vi.fn(),
    arcTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    transferFromImageBitmap: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const mockCanvasContext = createMockContext();

HTMLCanvasElement.prototype.getContext = ((_contextId: string, _options?: unknown) => mockCanvasContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;

global.OffscreenCanvas = class {
  width: number;
  height: number;
  private canvas: HTMLCanvasElement;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getContext(
    contextId: "2d",
    options?: CanvasRenderingContext2DSettings,
  ): CanvasRenderingContext2D | null {
    return this.canvas.getContext(
      contextId,
      options,
    ) as CanvasRenderingContext2D | null;
  }
} as unknown as typeof OffscreenCanvas;
