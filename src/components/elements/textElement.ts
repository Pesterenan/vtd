import { Element } from "src/components/elements/element";
import type { ITextElementData, Position, Size } from "src/components/types";
import { BoundingBox } from "src/utils/boundingBox";
import { toRadians } from "src/utils/transforms";

export class TextElement extends Element<ITextElementData> {
  public get font(): string {
    return this.properties.get("font") as string;
  }
  public set font(value: string) {
    this.properties.set("font", value);
    this.needsCacheUpdate = true;
    this.needsCenterRecalc = true;
  }
  public get fontStyle(): ITextElementData["fontStyle"] {
    return this.properties.get("fontStyle") as ITextElementData["fontStyle"];
  }
  public set fontStyle(value: ITextElementData["fontStyle"]) {
    this.properties.set("fontStyle", value);
    this.needsCacheUpdate = true;
  }
  public get fontWeight(): ITextElementData["fontWeight"] {
    return this.properties.get("fontWeight") as ITextElementData["fontWeight"];
  }
  public set fontWeight(value: ITextElementData["fontWeight"]) {
    this.properties.set("fontWeight", value);
    this.needsCacheUpdate = true;
  }
  public get textAlign(): ITextElementData["textAlign"] {
    return this.properties.get("textAlign") as ITextElementData["textAlign"];
  }
  public set textAlign(value: ITextElementData["textAlign"]) {
    this.properties.set("textAlign", value);
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
      this.needsCacheUpdate = true;
      this.needsCenterRecalc = true;
    }
  }
  public get lineHeight(): number {
    return this.properties.get("lineHeight") as number;
  }
  public set lineHeight(value: number) {
    if (value > 0.1) {
      this.properties.set("lineHeight", value);
      this.lineVerticalSpacing = this.fontSize * value;
      this.needsCacheUpdate = true;
      this.needsCenterRecalc = true;
    }
  }
  public get content(): string[] {
    const content = this.properties.get("content") as string;
    return content.split("\n") as string[];
  }
  public set content(value: string[]) {
    this.properties.set("content", value.join("\n"));
    this.needsCacheUpdate = true;
    this.needsCenterRecalc = true;
  }

  public lineVerticalSpacing: number;
  private boundingBox: BoundingBox;
  private needsCacheUpdate = true;
  private needsCenterRecalc = true;
  private cacheCanvas: OffscreenCanvas;
  private cacheContext: OffscreenCanvasRenderingContext2D | null = null;

  constructor(position: Position, size: Size, z: number) {
    super(position, size, z);
    this.properties.set("type", "text");
    this.content = ["Sample Text"];
    this.fillColor = "#bababa";
    this.font = "Impact";
    this.fontSize = 64;
    this.fontStyle = "normal";
    this.fontWeight = "normal";
    this.hasFill = true;
    this.hasStroke = false;
    this.lineHeight = 1.2;
    this.strokeColor = "#202020";
    this.strokeWidth = 10;
    this.textAlign = "center";

    this.lineVerticalSpacing = this.fontSize * this.lineHeight;
    this.cacheCanvas = new OffscreenCanvas(this.size.width, this.size.height);
    if (this.cacheCanvas) {
      this.cacheContext = this.cacheCanvas.getContext("2d");
    }
    this.boundingBox = new BoundingBox(position, size, this.rotation);
  }

  private refreshCache(): void {
    this.updateBoundingBox();
    this.updateCache();
  }

  private updateCache(): void {
    if (!this.needsCacheUpdate) return;
    const ctx = this.cacheContext;
    if (!ctx) return;
    const { width: w, height: h } = this.size;
    this.cacheCanvas.width = w;
    this.cacheCanvas.height = h;
    ctx.clearRect(0, 0, w, h);
    let originX: number;
    switch (this.textAlign) {
      case "left":
        originX = this.strokeWidth;
        break;
      case "right":
        originX = w - this.strokeWidth;
        break;
      default:
        originX = w / 2;
        break;
    }
    ctx.save();
    ctx.translate(originX, h / 2);
    this.drawText(ctx);
    ctx.restore();
    this.needsCacheUpdate = false;
  }

  public deserialize(data: ITextElementData): void {
    super.deserialize(data);
  }

  public serialize(): ITextElementData {
    return super.serialize();
  }

  private updateBoundingBox(): void {
    const ctx = this.cacheContext;
    if (!ctx) return;
    const weight = this.fontWeight === "normal" ? "" : this.fontWeight;
    ctx.font = `${weight} ${this.fontSize}px ${this.font}`;
    ctx.textAlign = this.textAlign as CanvasTextAlign;

    let width = 0;
    let height = 0;
    for (const line of this.content) {
      const metrics = ctx.measureText(line);
      const lineheight = this.fontSize;
      width = Math.max(
        width,
        metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
      );
      height += lineheight * this.lineHeight;
    }
    width += this.strokeWidth * 2;
    height += this.strokeWidth * 2;

    let centerX = this.position.x;
    let centerY = this.position.y;

    if (this.needsCenterRecalc) {
      const topLeft = this.boundingBox.topLeft;
      const topRight = this.boundingBox.topRight;
      switch (this.textAlign) {
        case "left":
          centerX = topLeft.x + width / 2;
          centerY = topLeft.y + height / 2;
          break;
        case "right":
          centerX = topRight.x - width / 2;
          centerY = topRight.y + height / 2;
          break;
        default:
          centerX = this.position.x;
          break;
      }
      this.needsCenterRecalc = false;
    }

    this.position = { x: centerX, y: centerY };
    this.size = { width, height };
    const scaledSize = {
      width: this.size.width * this.scale.x,
      height: this.size.height * this.scale.y,
    };
    this.boundingBox.update(this.position, scaledSize, this.rotation);
    this.needsCacheUpdate = true;
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;
    if (this.needsCacheUpdate) this.refreshCache();
    context.save();
    context.translate(this.position.x, this.position.y);
    context.rotate(toRadians(this.rotation));
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
      const w = this.cacheCanvas.width;
      const h = this.cacheCanvas.height;
      context.drawImage(this.cacheCanvas, -w / 2, -h / 2);
    }
  }

  private drawText(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): void {
    const weight = this.fontWeight === "normal" ? "" : this.fontWeight;
    context.font = `${weight} ${this.fontSize}px ${this.font}`;
    context.textAlign = this.textAlign as CanvasTextAlign;
    context.textBaseline = "middle";
    context.strokeStyle = this.strokeColor;
    context.lineJoin = "round";
    context.lineWidth = this.strokeWidth;
    context.fillStyle = this.fillColor;
    let yOffset = -(this.content.length - 1) * this.lineVerticalSpacing * 0.5;
    for (const line of this.content) {
      const metrics = context.measureText(line);
      const halfW = metrics.width / 2;
      if (this.hasStroke) context.strokeText(line, 0, yOffset);
      if (this.hasFill) context.fillText(line, 0, yOffset);
      if (this.fontStyle !== "normal") {
        let strokeLineHeight = yOffset;
        switch (this.fontStyle) {
          case "underline":
            strokeLineHeight += metrics.fontBoundingBoxDescent;
            break;
          case "strike-through":
            strokeLineHeight = yOffset;
            break;
          case "overline":
            strokeLineHeight -= metrics.fontBoundingBoxAscent;
            break;
        }
        context.save();
        context.beginPath();
        context.moveTo(-halfW, strokeLineHeight);
        context.lineTo(halfW, strokeLineHeight);
        context.closePath();
        context.strokeStyle = this.strokeColor;
        context.lineWidth = Math.round(this.strokeWidth * 0.5);
        context.stroke();
        context.restore();
      }
      yOffset += this.lineVerticalSpacing;
    }
  }

  public getBoundingBox(): BoundingBox {
    this.updateBoundingBox();
    return this.boundingBox;
  }
}
