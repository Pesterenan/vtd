import { Element } from "src/components/elements/element";
import type {
  BoundingBox,
  ITextElementData,
  Position,
  Size,
} from "src/components/types";

export class TextElement extends Element<ITextElementData> {
  public get font(): string {
    return this.properties.get("font") as string;
  }
  public set font(value: string) {
    this.properties.set("font", value);
    this.needsBoundingBoxUpdate = true;
    this.needsCacheUpdate = true;
  }
  public get fillColor(): string {
    return this.properties.get("fillColor") as string;
  }
  public set fillColor(value: string) {
    this.properties.set("fillColor", value);
    this.needsCacheUpdate = true;
  }
  public get strokeColor(): string {
    return this.properties.get("strokeColor") as string;
  }
  public set strokeColor(value: string) {
    this.properties.set("strokeColor", value);
    this.needsCacheUpdate = true;
  }
  public get strokeWidth(): number {
    return this.properties.get("strokeWidth") as number;
  }
  public set strokeWidth(value: number) {
    this.properties.set("strokeWidth", value);
    this.needsBoundingBoxUpdate = true;
    this.needsCacheUpdate = true;
  }
  public get hasFill(): boolean {
    return this.properties.get("hasFill") as boolean;
  }
  public set hasFill(value: boolean) {
    this.properties.set("hasFill", value);
    this.needsCacheUpdate = true;
  }
  public get hasStroke(): boolean {
    return this.properties.get("hasStroke") as boolean;
  }
  public set hasStroke(value: boolean) {
    this.properties.set("hasStroke", value);
    this.needsCacheUpdate = true;
  }
  public get fontSize(): number {
    return this.properties.get("fontSize") as number;
  }
  public set fontSize(value: number) {
    if (value > 1) {
      this.properties.set("fontSize", value);
      this.lineVerticalSpacing = this.lineHeight * value;
      this.needsBoundingBoxUpdate = true;
      this.needsCacheUpdate = true;
    }
  }
  public get lineHeight(): number {
    return this.properties.get("lineHeight") as number;
  }
  public set lineHeight(value: number) {
    if (value > 0.1) {
      this.properties.set("lineHeight", value);
      this.lineVerticalSpacing = this.fontSize * value;
      this.needsBoundingBoxUpdate = true;
      this.needsCacheUpdate = true;
    }
  }
  public get content(): string[] {
    const content = this.properties.get("content") as string;
    return content.split("\n") as string[];
  }
  public set content(value: string[]) {
    this.properties.set("content", value.join("\n"));
    this.needsBoundingBoxUpdate = true;
    this.needsCacheUpdate = true;
  }

  public lineVerticalSpacing: number;
  private corners: {
    upperLeft: Position;
    upperRight: Position;
    lowerRight: Position;
    lowerLeft: Position;
  };
  private needsBoundingBoxUpdate = true;
  private needsCacheUpdate = true;
  private cacheCanvas: OffscreenCanvas | null = null;
  private cacheContext: OffscreenCanvasRenderingContext2D | null = null;

  constructor(position: Position, size: Size, z: number) {
    super(position, size, z);
    this.properties.set("type", "text");
    this.content = ["Sample Text"];
    this.fillColor = "#bababa";
    this.font = "Impact";
    this.fontSize = 64;
    this.hasFill = true;
    this.hasStroke = false;
    this.lineHeight = 1.2;
    this.strokeColor = "#202020";
    this.strokeWidth = 10;

    this.lineVerticalSpacing = this.fontSize * this.lineHeight;
    const halfWidth = this.size.width * 0.5 * this.scale.x;
    const halfHeight = this.size.height * 0.5 * this.scale.y;
    this.corners = {
      upperLeft: { x: -halfWidth, y: -halfHeight },
      upperRight: { x: halfWidth, y: -halfHeight },
      lowerLeft: { x: halfWidth, y: halfHeight },
      lowerRight: { x: -halfWidth, y: halfHeight },
    };
    this.initializeCache();
  }

  private initializeCache(): void {
    if (!this.cacheCanvas) {
      this.cacheCanvas = new OffscreenCanvas(this.size.width, this.size.height);
      this.cacheContext = this.cacheCanvas.getContext("2d");
    }
  }

  private updateCache(): void {
    if (!this.cacheContext || !this.cacheCanvas || !this.needsCacheUpdate)
      return;
    const ctx = this.cacheContext;
    this.updateBoundingBox(ctx);
    const strokePadding = this.strokeWidth * 2;
    this.cacheCanvas.width = this.size.width + strokePadding;
    this.cacheCanvas.height = this.size.height + strokePadding;
    ctx.clearRect(0, 0, this.cacheCanvas.width, this.cacheCanvas.height);
    ctx.translate(this.cacheCanvas.width * 0.5, this.cacheCanvas.height * 0.5);
    this.drawText(ctx);
    this.needsCacheUpdate = false;
  }

  public deserialize(data: ITextElementData): void {
    super.deserialize(data);
  }

  public serialize(): ITextElementData {
    return super.serialize();
  }

  private updateBoundingBox(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): void {
    context.save();
    context.font = `${this.fontSize}pt ${this.font}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    if (!this.needsBoundingBoxUpdate) return;
    const totalSize = this.content.reduce(
      (acc, line) => {
        const metrics = context.measureText(line);
        const lineheight =
          metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        const linewidth =
          metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
        if (acc.width < linewidth) {
          acc.width = linewidth + this.strokeWidth;
        }
        acc.height += lineheight * (this.lineHeight) + this.strokeWidth;
        return acc;
      },
      { width: 0, height: 0 },
    );
    this.size = { ...totalSize };
    this.needsBoundingBoxUpdate = false;
    const halfWidth = this.size.width * 0.5 * this.scale.x;
    const halfHeight = this.size.height * 0.5 * this.scale.y;
    this.corners = {
      upperLeft: { x: -halfWidth, y: -halfHeight },
      upperRight: { x: halfWidth, y: -halfHeight },
      lowerLeft: { x: halfWidth, y: halfHeight },
      lowerRight: { x: -halfWidth, y: halfHeight },
    };
    this.needsCacheUpdate = true;
    context.restore();
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;
    if (this.needsCacheUpdate) this.updateCache();
    context.save();
    context.translate(this.position.x, this.position.y);
    context.rotate(this.rotation);
    context.scale(this.scale.x, this.scale.y);
    // Apply 'before' filters
    for (const filter of this.filters) {
      if (filter.applies === "before" && this.cacheCanvas) {
        filter.apply(context, this.cacheCanvas);
      }
    }
    // Draw text
    this.drawCache(context);
    // Apply 'after' filters
    for (const filter of this.filters) {
      if (filter.applies === "after" && this.cacheCanvas) {
        filter.apply(context, this.cacheCanvas);
      }
    }
    context.restore();
  }

  private drawCache(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): void {
    if (this.cacheCanvas) {
      context.drawImage(
        this.cacheCanvas,
        -this.size.width * 0.5 - this.strokeWidth,
        -this.size.height * 0.5 - this.strokeWidth,
      );
    }
  }

  private drawText(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): void {
    context.font = `${this.fontSize}pt ${this.font}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeStyle = this.strokeColor;
    context.lineJoin = "round";
    context.lineWidth = this.strokeWidth;
    context.fillStyle = this.fillColor;
    let yOffset = -(this.content.length - 1) * this.lineVerticalSpacing * 0.5;
    for (const line of this.content) {
      if (this.hasStroke) {
        context.strokeText(line, 0, yOffset);
      }
      if (this.hasFill) {
        context.fillText(line, 0, yOffset);
      }
      yOffset += this.lineVerticalSpacing;
    }
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
