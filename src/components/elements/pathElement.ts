import { BoundingBox } from "src/utils/boundingBox";
import type { IPathElementData, Point, Position, Size } from "../types";
import { Element } from "./element";
import { FilterRenderer } from "src/filters/filterRenderer";
import { rotatePoint, toRadians } from "src/utils/transforms";

export class PathElement extends Element<IPathElementData> {
  // --- Propriedades tipadas (atalhos para `this.properties`) ---
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
    return this.properties.get("strokeColor") as IPathElementData["strokeColor"];
  }
  public set strokeColor(value: string) {
    this.properties.set("strokeColor", value);
  }
  public get strokeWidth(): IPathElementData["strokeWidth"] {
    return this.properties.get("strokeWidth") as IPathElementData["strokeWidth"];
  }
  public set strokeWidth(value: number) {
    if (value <= 0) return;
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
    if (value <= 0) return;
    this.properties.set("miterLimit", value);
  }

  // --- Conversão de coordenadas ---
  // `points` são armazenados em LOCAL (relativo a `position`).
  // `position` está em WORLD (canvas).

  /** Local → World: soma o offset do elemento. */
  public toWorld(local: Point): Position {
    return { x: this.position.x + local.x, y: this.position.y + local.y };
  }

  /** World → Local: subtrai o offset do elemento. */
  public toLocal(world: Position): Point {
    return { x: world.x - this.position.x, y: world.y - this.position.y };
  }

  // --- Mutação de pontos (todas recentralizam) ---

  /** Adiciona um ponto em coordenadas de mundo, no índice ou ao final. */
  public addPoint(world: Position, index?: number): void {
    const local = this.toLocal(world);
    if (index === undefined) this.points.push(local);
    else this.points.splice(index, 0, local);
    this.recomputeBounds();
  }

  /** Move um vértice existente para nova posição de mundo. */
  public updatePoint(index: number, world: Position): void {
    if (index < 0 || index >= this.points.length) return;
    this.points[index] = this.toLocal(world);
    this.recomputeBounds();
  }

  /** Remove um vértice. */
  public removePoint(index: number): void {
    if (index < 0 || index >= this.points.length) return;
    this.points.splice(index, 1);
    this.recomputeBounds();
  }

  // --- Geometria / Bounds ---

  /** Extents locais (min/max) dos pontos. */
  private getLocalExtents(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (this.points.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of this.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }

  /**
   * Recentra `position` no centro geométrico dos pontos.
   * Preserva a posição em WORLD de cada vértice — só muda o referencial local.
   * Leva em conta `scale` e `rotation` para que o `position` visual não pule.
   */
  public recomputeBounds(): void {
    if (this.points.length <= 1) return;

    const ext = this.getLocalExtents();
    if (!ext) return;
    const centerLocal = { x: (ext.minX + ext.maxX) / 2, y: (ext.minY + ext.maxY) / 2 };

    // Desloca `position` pelo centro local já transformado por escala+rotação
    const scaled = { x: centerLocal.x * this.scale.x, y: centerLocal.y * this.scale.y };
    const rotatedOffset = rotatePoint(scaled, { x: 0, y: 0 }, this.rotation);
    this.position = {
      x: this.position.x + rotatedOffset.x,
      y: this.position.y + rotatedOffset.y,
    };

    // Rebaseia pontos para o novo centro
    this.points = this.points.map((p) => ({
      x: p.x - centerLocal.x,
      y: p.y - centerLocal.y,
    }));

    this.size = {
      width: ext.maxX - ext.minX || 1,
      height: ext.maxY - ext.minY || 1,
    };
    this.boundingBox.update(this.position, this.size, this.rotation);
  }

  // --- Ciclo de vida ---

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
    this.addPoint(position);
    this.boundingBox = new BoundingBox(position, size, this.rotation);
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible || this.points.length === 0) return;
    context.globalAlpha = this.opacity;
    if (this.filters.length > 0) {
      FilterRenderer.applyFilters(context, this.filters, (ctx) => this.drawPath(ctx));
    } else {
      this.drawPath(context);
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(toRadians(this.rotation));
    ctx.scale(this.scale.x, this.scale.y);

    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) ctx.lineTo(this.points[i].x, this.points[i].y);
    if (this.isClosed) ctx.closePath();

    if (this.hasFill && this.points.length > 1) {
      ctx.fillStyle = this.fillColor;
      ctx.fill();
    }

    if (this.hasStroke) {
      ctx.strokeStyle = this.strokeColor;
      ctx.lineWidth = this.strokeWidth;
      ctx.lineCap = this.lineCap;
      ctx.lineJoin = this.lineJoin;
      ctx.miterLimit = this.miterLimit;
      if (this.lineDash !== "solid") {
        ctx.setLineDash(this.lineDash === "dashed" ? [8, 6] : [1, 4]);
      }
      ctx.stroke();
      if (this.lineDash !== "solid") ctx.setLineDash([]);
    }

    ctx.restore();
  }

  public getBoundingBox(): BoundingBox {
    if (this.points.length <= 1) {
      this.boundingBox.update(this.position, this.size, this.rotation);
      return this.boundingBox;
    }

    const ext = this.getLocalExtents()!;
    const width = ext.maxX - ext.minX;
    const height = ext.maxY - ext.minY;
    const centerWorld = {
      x: this.position.x + (ext.minX + ext.maxX) / 2,
      y: this.position.y + (ext.minY + ext.maxY) / 2,
    };

    this.boundingBox.update(centerWorld, { width, height }, this.rotation);
    return this.boundingBox;
  }
}
