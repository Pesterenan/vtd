import EVENT from "src/utils/customEvents";
import type { Element } from "src/components/elements/element";
import type {
  BoundingBox,
  Position,
  Scale,
  Size,
  TElementData,
} from "src/components/types";
import { WorkArea } from "src/components/workArea";
import { RotateTool } from "./tools/rotateTool";
import { GrabTool } from "./tools/grabTool";
import { ScaleTool } from "./tools/scaleTool";

export class TransformBox {
  public position: Position = { x: 0, y: 0 };
  public scale: Scale = { x: 1.0, y: 1.0 };
  public size: Size = { width: 0, height: 0 };
  public anchorPoint: Position | null = null;
  public rotation = 0;

  private selectedElements: Element<TElementData>[] = [];
  private context: CanvasRenderingContext2D | null;
  public boundingBox: BoundingBox | null = null;
  public handles: Position[] | null = null;

  public constructor(
    selectedElements: Element<TElementData>[],
    canvas: HTMLCanvasElement,
  ) {
    this.context = canvas.getContext("2d");
    this.selectedElements = selectedElements;
    this.calculateBoundingBox();
  }

  private calculateBoundingBox(): void {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    this.selectedElements.forEach((element: Element<TElementData>) => {
      const boundingBox = element.getTransformedBoundingBox();
      if (boundingBox.x1 < minX) minX = boundingBox.x1;
      if (boundingBox.y1 < minY) minY = boundingBox.y1;
      if (boundingBox.x2 > maxX) maxX = boundingBox.x2;
      if (boundingBox.y2 > maxY) maxY = boundingBox.y2;
    });

    // Calcula a posição como o centro
    const width = maxX - minX;
    const height = maxY - minY;
    this.position = { x: minX + width / 2, y: minY + height / 2 };
    this.anchorPoint = { ...this.position };
    this.size = { width, height };
    this.boundingBox = {
      x1: minX,
      y1: minY,
      x2: maxX,
      y2: maxY,
    };

    this.generateHandles();
    window.dispatchEvent(
      new CustomEvent(EVENT.RECALCULATE_TRANSFORM_BOX, {
        detail: {
          position: this.position,
          size: this.size,
          rotation: this.rotation,
        },
      }),
    );
  }

  private generateHandles(): void {
    if (this.boundingBox) {
      const { x1, y1, x2, y2 } = this.boundingBox;
      this.handles = [
        { x: x1, y: y1 },
        { x: (x1 + x2) / 2, y: y1 }, // Top middle
        { x: x2, y: y1 },
        { x: x2, y: (y1 + y2) / 2 }, // Right middle
        { x: x2, y: y2 },
        { x: (x1 + x2) / 2, y: y2 }, // Bottom middle
        { x: x1, y: y2 },
        { x: x1, y: y1 + (y2 - y1) / 2 },
      ];
    }
  }
  // Função para rotacionar um ponto em torno de um centro
  private rotatePoint(
    point: Position,
    center: Position,
    angle: number,
  ): Position {
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
      x: cos * dx - sin * dy + center.x,
      y: sin * dx + cos * dy + center.y,
    };
  }

  public updatePosition({ x, y }: Position): void {
    const delta = { x: x - this.position.x, y: y - this.position.y };
    GrabTool.moveSelectedElements(this.selectedElements, delta);
    this.position = { x, y };
    this.anchorPoint = { ...this.position };

    if (this.boundingBox) {
      this.boundingBox = {
        x1: this.boundingBox.x1 + delta.x,
        y1: this.boundingBox.y1 + delta.y,
        x2: this.boundingBox.x2 + delta.x,
        y2: this.boundingBox.y2 + delta.y,
      };
    }
    this.handles =
      this.handles?.map((point) => ({
        x: point.x + delta.x,
        y: point.y + delta.y,
      })) || null;
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  public updateScale(newSize: Size, origin: Position = this.position): void {
    // Calcula o fator de escala baseado no novo tamanho
    const scaleX = newSize.width / this.size.width;
    const scaleY = newSize.height / this.size.height;

    // Atualizar o tamanho da caixa de transformação
    this.size.width = newSize.width;
    this.size.height = newSize.height;

    // Recalcular a posição baseada no ponto de origem e no fator de escala
    this.position.x = origin.x + (this.position.x - origin.x) * scaleX;
    this.position.y = origin.y + (this.position.y - origin.y) * scaleY;

    // Recalcular o bounding box
    this.boundingBox = {
      x1: this.position.x - this.size.width / 2,
      y1: this.position.y - this.size.height / 2,
      x2: this.position.x + this.size.width / 2,
      y2: this.position.y + this.size.height / 2,
    };

    this.anchorPoint = origin;

    this.handles = this.handles?.map((point) => ({
      x: origin.x + (point.x - origin.x) * scaleX,
      y: origin.y + (point.y - origin.y) * scaleY,
    })) || null;

    ScaleTool.scaleSelectedElements(this.selectedElements, this.anchorPoint, {
      width: scaleX,
      height: scaleY,
    });
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  public updateRotation(newValue: number, origin?: Position): void {
    this.anchorPoint = origin ? origin : this.position;
    const delta = newValue - this.rotation;
    RotateTool.rotateSelectedElements(
      this.selectedElements,
      this.anchorPoint,
      delta,
    );
    this.rotation = newValue;
    this.handles =
      this.handles?.map((point) =>
        this.rotatePoint(point, this.anchorPoint || this.position, delta),
      ) || null;
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  public contains(element: Element<TElementData>): boolean {
    return !!this.selectedElements.find((el) => el.zDepth === element.zDepth);
  }

  public draw(): void {
    if (!this.context || !this.boundingBox) return;
    const workAreaZoom = WorkArea.getInstance().zoomLevel;
    const workAreaOffset = WorkArea.getInstance().offset;

    // Draw bounding box
    this.context.save();
    this.context.translate(workAreaOffset.x, workAreaOffset.y);
    this.context.scale(workAreaZoom, workAreaZoom);
    const { x1, y1, x2, y2 } = this.boundingBox;

    const points = [
      { x: x1, y: y1 }, // Top-left
      { x: x2, y: y1 }, // Top-right
      { x: x2, y: y2 }, // Bottom-right
      { x: x1, y: y2 }, // Bottom-left
    ];

    // Rotacione os pontos ao redor do ponto de ancoragem
    const rotatedPoints = points.map((point) =>
      this.rotatePoint(point, this.anchorPoint || this.position, this.rotation),
    );
    this.context.strokeStyle = "red";
    this.context.setLineDash([3 / workAreaZoom, 3 / workAreaZoom]);
    this.context.lineWidth = 2 / workAreaZoom;
    this.context.beginPath();
    this.context.moveTo(rotatedPoints[0].x, rotatedPoints[0].y);
    rotatedPoints.forEach((point, index) => {
      if (index > 0) {
        if (this.context) {
          this.context.lineTo(point.x, point.y);
        }
      }
    });
    this.context.closePath();
    this.context.stroke();
    // Desenhar os handles
    if (this.handles) {
      this.handles.forEach((handle) => {
        if (this.context) {
          this.context.fillStyle = "blue";
          this.context.beginPath();
          this.context.arc(
            handle.x,
            handle.y,
            5 / workAreaZoom,
            0,
            Math.PI * 2,
          );
          this.context.closePath();
          this.context.fill();
        }
      });
    }

    this.context.restore();
  }
}
