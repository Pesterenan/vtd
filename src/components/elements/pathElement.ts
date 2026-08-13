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
    if (value <= 0)  return;
    this.properties.set("strokeWidth", value);
  }
  public get lineCap(): IPathElementData["lineCap"] {
    return this.properties.get("lineCap") as IPathElementData["lineCap"];
  }
  public set lineCap(value: IPathElementData["lineCap"]) {
    this.properties.set("lineCap", value);
  }
  public get lineJoin(): IPathElementData["lineJoin"] {
    return this.properties.get("lineJoin") as IPathElementData["lineJoin"];
  }
  public set lineJoin(value: IPathElementData["lineJoin"]) {
    this.properties.set("lineJoin", value);
  }
  public get lineDash(): IPathElementData["lineDash"] {
    return this.properties.get("lineDash") as IPathElementData["lineDash"];
  }
  public set lineDash(value: IPathElementData["lineDash"]) {
    this.properties.set("lineDash", value);
  }
  public get miterLimit(): IPathElementData["miterLimit"] {
    return this.properties.get("miterLimit") as IPathElementData["miterLimit"];
  }
  public set miterLimit(value: number) {
    if (value <= 0)  return;
    this.properties.set("miterLimit", value);
  }

  /** Converte um ponto local (relativo a position) para o espaço do canvas (mundo). */
  public toWorld(local: Point): Position {
    return { x: this.position.x + local.x, y: this.position.y + local.y };
  }

  /** Converte uma posição do canvas (mundo) para coordenada local (relativa a position). */
  public toLocal(world: Position): Point {
    return { x: world.x - this.position.x, y: world.y - this.position.y };
  }

  /** Adiciona um ponto em coordenadas do mundo ao path (no índice fornecido ou ao final). */
  public addPoint(world: Position, index?: number): void {
    const point = this.toLocal(world);
    if (index === undefined) {
      this.points.push(point);
    } else {
      this.points.splice(index, 0, point);
    }
    this.recalculateSize();
  }

  /** Atualiza a posição (mundo) de um ponto existente. */
  public updatePoint(index: number, world: Position): void {
    if (index < 0 || index >= this.points.length) return;
    this.points[index] = this.toLocal(world);
    this.recalculateSize();
  }

  /** Remove um ponto do path. */
  public removePoint(index: number): void {
    if (index < 0 || index >= this.points.length) return;
    this.points.splice(index, 1);
    this.recalculateSize();
  }

  /** Recalcula o size do elemento com base nos extents dos pontos locais. */
  public recalculateSize(): void {
    if (this.points.length <= 1) return;
    const xs = this.points.map((p) => p.x);
    const ys = this.points.map((p) => p.y);
    this.size = {
      width: Math.max(...xs) - Math.min(...xs) || 1,
      height: Math.max(...ys) - Math.min(...ys) || 1,
    };
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
    this.lineCap = "round";
    this.lineJoin = "miter";
    this.lineDash = "solid";
    this.miterLimit = 10;
    this.boundingBox = new BoundingBox(position, size, this.rotation);
  }
  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible || !this.points.length) return;
    context.globalAlpha = this.opacity;
    if (this.filters.length > 0) {
      FilterRenderer.applyFilters(context, this.filters, (ctx) =>
        this.drawPath(ctx),
      );
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
      context.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        context.lineTo(this.points[i].x, this.points[i].y);
      }
      if (this.isClosed) {
        context.closePath();
      }
      if (this.hasFill) {
        context.fillStyle = this.fillColor;
        context.fill();
      }
      if (this.hasStroke) {
        context.strokeStyle = this.strokeColor;
        context.lineWidth = this.strokeWidth;
        context.lineCap = this.lineCap;
        context.lineJoin = this.lineJoin;
        context.miterLimit = this.miterLimit;
        if (this.lineDash !== "solid") {
          context.setLineDash(this.lineDash === "dashed" ? [8, 6] : [1, 4]);
        }
        context.stroke();
        if (this.lineDash !== "solid") {
          context.setLineDash([]);
        }
      }
      context.restore();
    }
  }

  /**
   * Calcula o bounding box baseado na posição e tamanho do elemento.
   * Considera também os pontos reais do path quando disponíveis para recálculo.
   */
  public getBoundingBox(): BoundingBox {    // Com 0 ou 1 ponto não há extents confiáveis; usa position/size (fallback).
    if (this.points.length <= 1) {
      this.boundingBox.update(this.position, this.size, this.rotation);
      return this.boundingBox;
    }

    // Extents dos pontos (coordenadas locais, relativas a position).
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const width = maxX - minX;
    const height = maxY - minY;

    // O centro do box deve estar em coordenadas do mundo: position + centro local.
    this.boundingBox.update(
      {
        x: this.position.x + (minX + maxX) / 2,
        y: this.position.y + (minY + maxY) / 2,
      },
      { width, height },
      this.rotation,
    );

    return this.boundingBox;
  }
}
