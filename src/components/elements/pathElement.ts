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

  // --- Conversão de coordenadas ---
  // `points` são armazenados em LOCAL (relativo a `position`, sem escala/rotação).
  // `position` está em WORLD (canvas/workArea).
  // Ordem do render (drawPath): translate(position) -> rotate(rotation) -> scale(scale),
  // logo: world = position + R(rotation) * (S * local).

  /** Local → World: aplica escala, rotação e offset do elemento. */
  public toWorld(local: Point): Point {
    const worldPoint: Point = { in: null, center: { x: 0, y: 0 }, out: null };
    for (const which of ["in", "out", "center"] as const) {
      if (local[which] !== null) {
        worldPoint[which] = this.toWorldPos(local[which]);
      }
    }
    return worldPoint;
  }

  /** Local Position absoluta -> World (com escala+rotação). */
  public toWorldPos(localPos: Position): Position {
    const scaled = {
      x: localPos.x * this.scale.x,
      y: localPos.y * this.scale.y,
    };
    const rotated = rotatePoint(scaled, { x: 0, y: 0 }, this.rotation);
    return { x: this.position.x + rotated.x, y: this.position.y + rotated.y };
  }

  /** World -> Local Position (inversa: desfaz offset, rotação e escala). */
  public toLocalPos(world: Position): Position {
    const translated = {
      x: world.x - this.position.x,
      y: world.y - this.position.y,
    };
    const unrotated = rotatePoint(translated, { x: 0, y: 0 }, -this.rotation);
    const sx = this.scale.x === 0 ? 1 : this.scale.x;
    const sy = this.scale.y === 0 ? 1 : this.scale.y;
    return { x: unrotated.x / sx, y: unrotated.y / sy };
  }

  /** World → Local: cria um vértice corner na posição de mundo dada. */
  public toLocal(world: Position): Point {
    return {
      center: this.toLocalPos(world),
      in: null,
      out: null,
    };
  }

  /** Vetor em World -> vetor em Local (sem translação: só R^-1 + /S). */
  private toLocalVector(worldVec: Position): Position {
    const unrotated = rotatePoint(worldVec, { x: 0, y: 0 }, -this.rotation);
    const sx = this.scale.x === 0 ? 1 : this.scale.x;
    const sy = this.scale.y === 0 ? 1 : this.scale.y;
    return { x: unrotated.x / sx, y: unrotated.y / sy };
  }

  // --- Mutação de pontos (todas recentralizam) ---

  /** Adiciona um ponto em coordenadas de mundo, no índice ou ao final. */
  public addPoint(world: Position, index?: number): void {
    const local = this.toLocal(world);
    if (index === undefined) this.points.push(local);
    else this.points.splice(index, 0, local);
    this.recomputeBounds();
  }

  /** Atualiza um handle específico ('in' ou 'out') em coordenadas de mundo. */
  public updateHandle(
    index: number,
    which: "in" | "out",
    world: Position,
  ): void {
    if (index < 0 || index >= this.points.length) return;
    const pt = this.points[index];
    const local = this.toLocalPos(world);
    if (which === "in") pt.in = local;
    else pt.out = local;
    this.recomputeBounds();
  }

  /** Define ambos os handles de um ponto em coordenadas de mundo. */
  public setHandles(
    index: number,
    handleInWorld: Position | null,
    handleOutWorld: Position | null,
  ): void {
    if (index < 0 || index >= this.points.length) return;
    const pt = this.points[index];
    pt.in = handleInWorld ? this.toLocalPos(handleInWorld) : null;
    pt.out = handleOutWorld ? this.toLocalPos(handleOutWorld) : null;
    this.recomputeBounds();
  }

  public isBezier(index: number): boolean {
    if (index < 0 || index >= this.points.length) return false;
    const p = this.points[index];
    return !!p.in || !!p.out;
  }

  /** Move um vértice existente para nova posição de mundo (translada handles junto). */
  public updatePoint(index: number, world: Position): void {
    if (index < 0 || index >= this.points.length) return;
    const old = this.points[index];
    const oldWorld = this.toWorld(old);
    const deltaWorld = {
      x: world.x - oldWorld.center.x,
      y: world.y - oldWorld.center.y,
    };
    // Handles vivem em espaço local: o delta de mundo precisa ser
    // convertido (R^-1 + /S), senão deforma com escala/rotação.
    const deltaLocal = this.toLocalVector(deltaWorld);
    const newLocalPos = this.toLocalPos(world);
    this.points[index] = {
      center: newLocalPos,
      in: old.in
        ? { x: old.in.x + deltaLocal.x, y: old.in.y + deltaLocal.y }
        : null,
      out: old.out
        ? { x: old.out.x + deltaLocal.x, y: old.out.y + deltaLocal.y }
        : null,
    };
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
  private getLocalExtents(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null {
    if (this.points.length === 0) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of this.points) {
      minX = Math.min(minX, p.center.x);
      minY = Math.min(minY, p.center.y);
      maxX = Math.max(maxX, p.center.x);
      maxY = Math.max(maxY, p.center.y);
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
    const centerLocal = {
      x: (ext.minX + ext.maxX) / 2,
      y: (ext.minY + ext.maxY) / 2,
    };

    // Desloca `position` pelo centro local já transformado por escala+rotação
    const scaled = {
      x: centerLocal.x * this.scale.x,
      y: centerLocal.y * this.scale.y,
    };
    const rotatedOffset = rotatePoint(scaled, { x: 0, y: 0 }, this.rotation);
    this.position = {
      x: this.position.x + rotatedOffset.x,
      y: this.position.y + rotatedOffset.y,
    };

    // Rebaseia pontos para o novo centro
    this.points = this.points.map((p) => ({
      center: {
        x: p.center.x - centerLocal.x,
        y: p.center.y - centerLocal.y,
      },
      in: p.in
        ? { x: p.in.x - centerLocal.x, y: p.in.y - centerLocal.y }
        : null,
      out: p.out
        ? { x: p.out.x - centerLocal.x, y: p.out.y - centerLocal.y }
        : null,
    }));

    this.size = {
      width: ext.maxX - ext.minX || 1,
      height: ext.maxY - ext.minY || 1,
    };
    const scaledSize = {
      width: this.size.width * Math.abs(this.scale.x),
      height: this.size.height * Math.abs(this.scale.y),
    };
    this.boundingBox.update(this.position, scaledSize, this.rotation);
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

  public deserialize(data: IPathElementData): void {
    super.deserialize(data);
  }

  public serialize(): IPathElementData {
    return super.serialize();
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible || this.points.length === 0) return;
    context.globalAlpha = this.opacity;
    if (this.filters.length > 0) {
      FilterRenderer.applyFilters(context, this.filters, (ctx) =>
        this.drawPath(ctx),
      );
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
    ctx.moveTo(this.points[0].center.x, this.points[0].center.y);
    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1],
        cur = this.points[i];
      if (prev.out || cur.in) {
        const cp1 = prev.out ?? prev.center;
        const cp2 = cur.in ?? cur.center;
        ctx.bezierCurveTo(
          cp1.x,
          cp1.y,
          cp2.x,
          cp2.y,
          cur.center.x,
          cur.center.y,
        );
      } else {
        ctx.lineTo(cur.center.x, cur.center.y);
      }
    }
    if (this.isClosed && this.points.length > 1) {
      const last = this.points[this.points.length - 1];
      const first = this.points[0];
      if (last.out || first.in) {
        const cp1 = last.out ?? last.center;
        const cp2 = first.in ?? first.center;
        ctx.bezierCurveTo(
          cp1.x,
          cp1.y,
          cp2.x,
          cp2.y,
          first.center.x,
          first.center.y,
        );
      }
      ctx.closePath();
    } else if (this.isClosed) {
      ctx.closePath();
    }

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
      const scaledSize = {
        width: this.size.width * Math.abs(this.scale.x),
        height: this.size.height * Math.abs(this.scale.y),
      };
      this.boundingBox.update(this.position, scaledSize, this.rotation);
      return this.boundingBox;
    }

    const ext = this.getLocalExtents()!;
    const width = ext.maxX - ext.minX || 1;
    const height = ext.maxY - ext.minY || 1;
    const centerWorld = this.toWorldPos({
      x: (ext.minX + ext.maxX) / 2,
      y: (ext.minY + ext.maxY) / 2,
    });

    this.boundingBox.update(
      centerWorld,
      {
        width: width * Math.abs(this.scale.x),
        height: height * Math.abs(this.scale.y),
      },
      this.rotation,
    );
    return this.boundingBox;
  }
}
