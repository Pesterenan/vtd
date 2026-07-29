import { BoundingBox } from "src/utils/boundingBox";
import type { IPathElementData, Point, Position, Size } from "../types";
import { Element } from "./element";
import { FilterRenderer } from "src/filters/filterRenderer";
import { toRadians } from "src/utils/transforms";

export class PathElement extends Element<IPathElementData> {
  public get points(): IPathElementData["points"] {
    return this.properties.get("points") as IPathElementData["points"];
  }
  public set points(value: Point[]) {
    this.properties.set("points", value);
  }
  public get isClosed(): IPathElementData["isClosed"] {
    return this.properties.get("isClosed") as IPathElementData["isClosed"];
  }
  public set isClosed(value: boolean) {
    this.properties.set("isClosed", value);
  }
  public get hasFill(): IPathElementData["hasFill"] {
    return this.properties.get("hasFill") as IPathElementData["hasFill"];
  }
  public set hasFill(value: boolean) {
    this.properties.set("hasFill", value);
  }
  public get hasStroke(): IPathElementData["hasStroke"] {
    return this.properties.get("hasStroke") as IPathElementData["hasStroke"];
  }
  public set hasStroke(value: boolean) {
    this.properties.set("hasStroke", value);
  }
  public get fillColor(): IPathElementData["fillColor"] {
    return this.properties.get("fillColor") as IPathElementData["fillColor"];
  }
  public set fillColor(value: string) {
    this.properties.set("fillColor", value);
  }
  public get strokeColor(): IPathElementData["strokeColor"] {
    return this.properties.get(
      "strokeColor",
    ) as IPathElementData["strokeColor"];
  }
  public set strokeColor(value: string) {
    this.properties.set("strokeColor", value);
  }
  public get strokeWidth(): IPathElementData["strokeWidth"] {
    return this.properties.get(
      "strokeWidth",
    ) as IPathElementData["strokeWidth"];
  }
  public set strokeWidth(value: number) {
    this.properties.set("strokeWidth", value);
  }

  private boundingBox: BoundingBox;
  public constructor(position: Position, size: Size, z: number) {
    super(position, size, z);
    this.properties.set("type", "path");
    this.points = [];
    this.isClosed = false;
    this.fillColor = "#E0E0E0";
    this.strokeColor = "#202020";
    this.strokeWidth = 3;
    this.hasFill = false;
    this.hasStroke = true;
    this.boundingBox = new BoundingBox(position, size, this.rotation);
  }
  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible || !this.points.length) return;
    context.globalAlpha = this.opacity;
    if (this.filters.length > 0) {
      FilterRenderer.applyFilters(context, this.filters, this.drawPath);
    } else {
      this.drawPath(context);
    }
  }

  private drawPath(context: CanvasRenderingContext2D) {
    if (this.points.length) {
      context.save();
      context.translate(this.position.x, this.position.y);
      context.rotate(toRadians(this.rotation));
      context.scale(this.scale.x, this.scale.y);
      context.beginPath();
      context.moveTo(this.points[0].position.x, this.points[0].position.y);
      context.strokeStyle = this.strokeColor;
      context.lineWidth = this.strokeWidth;
      context.stroke();
      context.restore();
    }
  }

  private updateBoundingBox(): void {
    if (!this.points.length) return;
    if (this.points.length === 1) {
      this.boundingBox.update(
        this.points[0].position,
        this.size,
        this.rotation,
      );
      return;
    }
    let minX,
      minY = -Infinity;
    let maxX,
      maxY = Infinity;
    for (const point of this.points) {
      const { x, y } = point.position;
      minX = Math.max(minX, x);
      maxX = Math.min(maxX, x);
      minY = Math.max(minY, y);
      maxY = Math.min(maxY, y);
    }
    this.position = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    this.boundingBox.update(this.position, this.size, this.rotation);
  }

  public getBoundingBox(): BoundingBox {
    this.updateBoundingBox();
    return this.boundingBox;
  }
}
