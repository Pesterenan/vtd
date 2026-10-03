import type { Point, Position } from "src/components/types";
import {
  buildShapePoints,
  lockBox,
  normalizeBox,
  resolveShapeBox,
} from "./shapeGeometry";
import type { ShapeBox, ShapeMode } from "./shapeGeometry";

describe("shapeGeometry", () => {
  describe("normalizeBox", () => {
    it("cria caixa com tamanho positivo para drag direto", () => {
      const box: ShapeBox = normalizeBox(
        { x: 10, y: 20 },
        { x: 100, y: 80 },
        false,
      );

      expect(box).toEqual({ x: 10, y: 20, w: 90, h: 60 });
    });

    it("normaliza drag invertido para a mesma caixa", () => {
      const box: ShapeBox = normalizeBox(
        { x: 100, y: 80 },
        { x: 10, y: 20 },
        false,
      );

      expect(box).toEqual({ x: 10, y: 20, w: 90, h: 60 });
    });

    it("expande simetricamente ao redor do centro quando fromCenter", () => {
      const start: Position = { x: 100, y: 100 };
      const box: ShapeBox = normalizeBox(start, { x: 150, y: 120 }, true);

      expect(box).toEqual({ x: 50, y: 80, w: 100, h: 40 });
    });
  });

  describe("lockBox", () => {
    it("trava retangulo largo em quadrado usando o maior lado", () => {
      const locked: ShapeBox = lockBox(
        { x: 10, y: 10, w: 100, h: 50 },
        "rectangle",
      );

      expect(locked.w).toBe(100);
      expect(locked.h).toBe(100);
    });

    it("trava retangulo alto em quadrado usando o maior lado", () => {
      const locked: ShapeBox = lockBox(
        { x: 10, y: 10, w: 50, h: 100 },
        "rectangle",
      );

      expect(locked.w).toBe(100);
      expect(locked.h).toBe(100);
    });

    it("trava elipse em quadrado (circulo)", () => {
      const locked: ShapeBox = lockBox({ x: 0, y: 0, w: 60, h: 30 }, "ellipse");

      expect(locked.w).toBe(locked.h);
      expect(locked.w).toBe(60);
    });

    it("preserva caixa zerada sem NaN", () => {
      const locked: ShapeBox = lockBox({ x: 5, y: 5, w: 0, h: 0 }, "rectangle");

      expect(locked.w).toBe(0);
      expect(locked.h).toBe(0);
    });
  });

  describe("resolveShapeBox", () => {
    const firstPoint: Position = { x: 0, y: 0 };
    const lastPoint: Position = { x: 100, y: 50 };
    const mode: ShapeMode = "rectangle";

    it("retorna um shapeBox neutro, sem modifiers", () => {
      const neutral = resolveShapeBox(firstPoint, lastPoint, { mode });

      expect(neutral.x).toBe(0);
      expect(neutral.y).toBe(0);
      expect(neutral.w).toBe(100);
      expect(neutral.h).toBe(50);
    });

    it("retorna um shapeBox com centro no meio", () => {
      const centered = resolveShapeBox(firstPoint, lastPoint, {
        fromCenter: true,
        mode,
      });

      expect(centered.x).toBe(-100);
      expect(centered.y).toBe(-50);
      expect(centered.w).toBe(200);
      expect(centered.h).toBe(100);
    });

    it("retorna um shapeBox com proporção travada", () => {
      const locked = resolveShapeBox(firstPoint, lastPoint, {
        square: true,
        mode,
      });

      expect(locked.x).toBe(0);
      expect(locked.y).toBe(0);
      expect(locked.w).toBe(100);
      expect(locked.h).toBe(100);
    });

    it("retorna um shapeBox centrado e com proporção travada", () => {
      const centeredSquared = resolveShapeBox(firstPoint, lastPoint, {
        fromCenter: true,
        square: true,
        mode,
      });

      expect(centeredSquared.x).toBe(-100);
      expect(centeredSquared.y).toBe(-50);
      expect(centeredSquared.w).toBe(200);
      expect(centeredSquared.h).toBe(200);
    });
  });

  describe("buildShapePoints", () => {
    const square: ShapeBox = { x: 0, y: 0, w: 100, h: 100 };

    it("retangulo retorna 4 cantos da caixa", () => {
      const points: Point[] = buildShapePoints("rectangle", square, 5);

      expect(points).toHaveLength(4);
      const centers = points.map((p) => p.center);
      expect(centers).toEqual(
        expect.arrayContaining([
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ]),
      );
    });

    it("elipse retorna 4 pontos Bezier com handles", () => {
      const points: Point[] = buildShapePoints("ellipse", square, 5);

      expect(points).toHaveLength(4);
      for (const p of points) {
        expect(p.in).not.toBeNull();
        expect(p.out).not.toBeNull();
      }
    });

    it("triangulo retorna 3 pontos inscritos", () => {
      const points: Point[] = buildShapePoints("triangle", square, 5);

      expect(points).toHaveLength(3);
    });

    it("poligono retorna N pontos", () => {
      const points: Point[] = buildShapePoints("polygon", square, 6);

      expect(points).toHaveLength(6);
    });

    it("estrela retorna 2N pontos alternando raio externo/interno", () => {
      const points: Point[] = buildShapePoints("star", square, 5);

      expect(points).toHaveLength(10);
      const cx = square.x + square.w / 2;
      const cy = square.y + square.h / 2;
      const dist = (c: Position): number => Math.hypot(c.x - cx, c.y - cy);
      const outer = dist(points[0].center);
      const inner = dist(points[1].center);
      expect(outer).toBeGreaterThan(0);
      expect(inner).toBeGreaterThan(0);
      expect(inner / outer).toBeCloseTo(0.5, 1);
    });
  });
});
