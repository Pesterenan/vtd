import { Element } from "./element";
import { BoundingBox, ITextElementData, Position, Size } from "./types";

export class TextElement extends Element {
  public content: string[];
  public font: string;
  public fontSize: number;
  public strokeColor: string;
  public fillColor: string;
  public lineHeight: number;
  public lineVerticalSpacing: number;
  private corners: {
    upperLeft: Position;
    upperRight: Position;
    lowerRight: Position;
    lowerLeft: Position;
  };

  constructor(position: Position, size: Size, z: number) {
    super(position, size, z);
    this.content = ["Sample", "Text"];
    this.font = "Arial";
    this.fontSize = 32;
    this.lineHeight = 1.2;
    this.lineVerticalSpacing = this.fontSize * this.lineHeight;

    const randomR = Math.floor(Math.random() * 99).toFixed(0);
    const randomG = Math.floor(Math.random() * 99).toFixed(0);
    const randomB = Math.floor(Math.random() * 99).toFixed(0);
    this.fillColor = `#${randomR.padEnd(2, "F")}${randomG.padEnd(2, "F")}${randomB.padEnd(2, "F")}`;
    this.strokeColor = `#${randomR.padEnd(2, "F")}${randomG.padEnd(2, "F")}${randomB.padEnd(2, "F")}`;

    const halfWidth = this.size.width * 0.5 * this.scale.x;
    const halfHeight = this.size.height * 0.5 * this.scale.y;
    this.corners = {
      upperLeft: { x: -halfWidth, y: -halfHeight },
      upperRight: { x: halfWidth, y: -halfHeight },
      lowerLeft: { x: halfWidth, y: halfHeight },
      lowerRight: { x: -halfWidth, y: halfHeight },
    };
  }

  public deserialize(data: ITextElementData): void {
    super.deserialize(data);
    this.font = data.font;
    this.fontSize = data.fontSize;
    this.content = data.content;
  }

  public serialize(): ITextElementData {
    const serializedText = super.serialize() as ITextElementData;
    serializedText.type = "text";
    serializedText.content = this.content;
    serializedText.font = this.font;
    serializedText.fontSize = this.fontSize;
    return serializedText;
  }

  private updateBoundingBox(context: CanvasRenderingContext2D): void {
    context.save();
    const totalSize = this.content.reduce(
      (acc, line) => {
        const metrics = context.measureText(line);
        const linewidth =
          metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
        if (acc.width < linewidth) {
          acc.width = linewidth;
        }
        acc.height += this.lineVerticalSpacing;
        return acc;
      },
      { width: 0, height: 0 },
    );
    this.size = { ...totalSize };
    const halfWidth = this.size.width * 0.5 * this.scale.x;
    const halfHeight = this.size.height * 0.5 * this.scale.y;
    this.corners = {
      upperLeft: { x: -halfWidth, y: -halfHeight },
      upperRight: { x: halfWidth, y: -halfHeight },
      lowerLeft: { x: halfWidth, y: halfHeight },
      lowerRight: { x: -halfWidth, y: halfHeight },
    };
    context.restore();
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;
    context.save();
    context.fillStyle = this.fillColor;
    context.font = `${this.fontSize}px ${this.font}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    this.updateBoundingBox(context);
    context.translate(this.position.x, this.position.y);
    context.rotate(this.rotation);
    context.scale(this.scale.x, this.scale.y);

    // Desenha cada linha de texto com deslocamento vertical
    let yOffset = -(this.content.length - 1) * this.lineVerticalSpacing * 0.5; // Centraliza verticalmente as linhas
    for (const line of this.content) {
      context.fillText(line, 0, yOffset);
      yOffset += this.lineVerticalSpacing;
    }
    context.restore();
  }

  public getTransformedBoundingBox(): BoundingBox {
    const transformedCorners = Object.values(this.corners).map(({ x, y }) => {
      const transformedX =
        this.position.x +
        x * Math.cos(this.rotation) -
        y * Math.sin(this.rotation);
      const transformedY =
        this.position.y +
        x * Math.sin(this.rotation) +
        y * Math.cos(this.rotation);
      return { x: transformedX, y: transformedY };
    });

    const xCoordinates = transformedCorners.map((corner) => corner.x);
    const yCoordinates = transformedCorners.map((corner) => corner.y);

    return {
      x1: Math.min(...xCoordinates),
      y1: Math.min(...yCoordinates),
      x2: Math.max(...xCoordinates),
      y2: Math.max(...yCoordinates),
    };
  }
}
