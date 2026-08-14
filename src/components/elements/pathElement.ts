import { BoundingBox } from "src/utils/boundingBox";
import type { IPathElementData, Point, Position, Size } from "../types";
import { Element } from "./element";
import { FilterRenderer } from "src/filters/filterRenderer";
import { rotatePoint, toRadians } from "src/utils/transforms";

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
    this.recomputeBounds();
  }

  /** Atualiza a posição (mundo) de um ponto existente. */
  public updatePoint(index: number, world: Position): void {
    if (index < 0 || index >= this.points.length) return;
    this.points[index] = this.toLocal(world);
    this.recomputeBounds();
  }

  /** Remove um ponto do path. */
  public removePoint(index: number): void {
    if (index < 0 || index >= this.points.length) return;
    this.points.splice(index, 1);
    this.recomputeBounds();
  }

  /**
   * Recentra os pontos do path no seu centro geométrico: o `position` passa a
   * ser o centro da bounding box e os pontos locais são deslocados na mesma
   * proporção. Como a geometria no espaço do mundo é preservada, o path
   * permanece "no mesmo lugar" visualmente, mas a caixa de seleção/transformação
   * passa a envolver o path corretamente. Leva em conta escala e rotação.
   */
  public recomputeBounds(): void {
    if (this.points.length <= 1) return;

    const xs = this.points.map((p) => p.x);
    const ys = this.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

    // O position é deslocado pelo centro local transformado por rot+escala,
    // mantendo a posição renderizada de cada ponto inalterada.
    const rotatedCenter = rotatePoint(
      { x: center.x * this.scale.x, y: center.y * this.scale.y },
      { x: 0, y: 0 },
      this.rotation,
    );
    this.position = {
      x: this.position.x + rotatedCenter.x,
      y: this.position.y + rotatedCenter.y,
    };

    this.points = this.points.map((p) => ({
      x: p.x - center.x,
      y: p.y - center.y,
    }));

    this.size = {
      width: maxX - minX || 1,
      height: maxY - minY || 1,
    };
    this.boundingBox.update(this.position,this.size,this.rotation);
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
    this.addPoint(position);
    this.boundingBox = new BoundingBox(position, size, this.rotation);
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible || !this.points.length) return;
    context.globalAlpha = this.opacity;
    if (this.filters.length > 0) {
      FilterRenderer.applyFilters(context, this.filters, (ctx) => {
        this.drawPath(ctx);
      });
    } else {
      this.drawPath(context);
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D): void {
    if (!this.points.length) return;

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(toRadians(this.rotation));
    ctx.scale(this.scale.x, this.scale.y);

    // Desenha a linha do path principal
    ctx.beginPath();
    if (this.points.length > 0) {
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }

      if (this.isClosed) {
        ctx.closePath();
      }

      // Preenchimento (se habilitado)
      if (this.hasFill && this.points.length > 1) {
        ctx.fillStyle = this.fillColor;
        ctx.fill();
      }

      // Stroke da linha principal
      if (this.hasStroke) {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.lineCap = this.lineCap;
        ctx.lineJoin = this.lineJoin;
        ctx.miterLimit = this.miterLimit;

        if (this.lineDash !== "solid") {
          ctx.setLineDash(
            this.lineDash === "dashed" ? [8, 6] : [1, 4],
          );
        }

        ctx.stroke();

        if (this.lineDash !== "solid") {
          ctx.setLineDash([]);
        }
      }
    }

    ctx.restore();
  }

  /**
   * Calcula o bounding box baseado na posição e tamanho do elemento.
   * Considera também os pontos reais do path quando disponíveis para recálculo.
   */
  public getBoundingBox(): BoundingBox {
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
