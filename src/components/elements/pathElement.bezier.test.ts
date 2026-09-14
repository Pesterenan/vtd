/**
 * @vitest-environment jsdom
 * Bezier Point com center + in/out (modelo congelado).
 */
import type { IPathElementData, Position, Size, Point } from "src/components/types";
import { PathElement } from "./pathElement";

describe("PathElement - Bezier", () => {
  const position: Position = { x: 100, y: 200 };
  const initialSize: Size = { width: 300, height: 150 };
  const zIndex = 5;
  let element: PathElement;

  beforeEach(() => {
    element = new PathElement(position, initialSize, zIndex);
  });

  describe("Point model: center + handles", () => {
    it("primeiro ponto deve ter center e handles nulos (corner)", () => {
      const p = element.points[0];
      expect(p).toHaveProperty("center");
      expect(p.center).toEqual({ x: 0, y: 0 });
      expect(p.in).toBeNull();
      expect(p.out).toBeNull();
    });

    it("permite setar points com center + handles", () => {
      const bezierPoint: Point = {
        center: { x: 0, y: 0 },
        in: { x: -10, y: -10 },
        out: { x: 10, y: 10 },
      };
      element.points = [bezierPoint, { center: { x: 50, y: 0 }, in: null, out: null }];
      expect(element.points[0]).toEqual(bezierPoint);
      expect(element.isBezier(0)).toBe(true);
      expect(element.isBezier(1)).toBe(false);
    });
  });

  describe("addPoint cria corner", () => {
    it("addPoint com mundo deve criar Point com center local e handles nulos", () => {
      element.addPoint({ x: 200, y: 250 });
      const p1 = element.points[1];
      expect(p1.center).toBeDefined();
      expect(p1.in).toBeNull();
      expect(p1.out).toBeNull();
      expect(element.toWorld(p1).center).toEqual({ x: 200, y: 250 });
    });
  });

  describe("setHandles / updateHandle", () => {
    it("setHandles define in/out em mundo e armazena local", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 50, y: 0 }, in: null, out: null },
      ];
      element.setHandles(0, { x: 90, y: 190 }, { x: 110, y: 210 });
      const p0 = element.points[0];
      expect(p0.in).toBeDefined();
      expect(p0.out).toBeDefined();
      expect(p0.out).not.toBeNull();
    });

    it("updateHandle com 'out' move só out (independente)", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: { x: -10, y: 0 }, out: { x: 10, y: 0 } },
      ];
      element.updateHandle(0, "out", { x: 130, y: 200 });
      const p0 = element.points[0];
      expect(p0.in).toEqual({ x: -10, y: 0 });
      expect(p0.out).not.toEqual({ x: 10, y: 0 });
    });

    it("updateHandle out-of-range não faz nada", () => {
      element.points = [{ center: { x: 0, y: 0 }, in: null, out: null }];
      element.updateHandle(5, "out", { x: 999, y: 999 });
      expect(element.points).toHaveLength(1);
    });
  });

  describe("updatePoint translada handles", () => {
    it("mover anchor deve transladar handles pelo mesmo delta (em mundo)", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: { x: -10, y: 0 }, out: { x: 10, y: 0 } },
        { center: { x: 50, y: 0 }, in: null, out: null },
      ];
      const beforeInWorld = element.toWorldPos(element.points[0].in!);
      const beforeOutWorld = element.toWorldPos(element.points[0].out!);
      const world0 = element.toWorld(element.points[0]).center;
      element.updatePoint(0, { x: world0.x + 10, y: world0.y });
      const after = element.points[0];
      const afterInWorld = element.toWorldPos(after.in!);
      const afterOutWorld = element.toWorldPos(after.out!);
      expect(afterInWorld.x).toBe(beforeInWorld.x + 10);
      expect(afterOutWorld.x).toBe(beforeOutWorld.x + 10);
      expect(afterInWorld.y).toBe(beforeInWorld.y);
      expect(afterOutWorld.y).toBe(beforeOutWorld.y);
    });
  });

  describe("recomputeBounds ignora handles", () => {
    it("recomputeBounds deve usar só center para centro, não handles distantes", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: null, out: { x: 100, y: 100 } },
        { center: { x: 10, y: 0 }, in: null, out: null },
      ];
      const posBefore = { ...element.position };
      element.recomputeBounds();
      expect(element.position.x).not.toBe(posBefore.x + 50);
      expect(element.position.x).toBe(posBefore.x + 5);
    });
  });

  describe("draw usa bezierCurveTo", () => {
    function mockContext(): CanvasRenderingContext2D {
      return {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
        fillStyle: "#000",
        strokeStyle: "#000",
        lineWidth: 1,
        lineCap: "round",
        lineJoin: "miter",
        miterLimit: 10,
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D;
    }

    it("deve chamar bezierCurveTo quando há out/in", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: null, out: { x: 10, y: 0 } },
        { center: { x: 50, y: 0 }, in: { x: 40, y: 0 }, out: null },
      ];
      const ctx = mockContext();
      element.draw(ctx);
      expect(ctx.bezierCurveTo).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    });

    it("deve usar lineTo quando não há handles", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 50, y: 0 }, in: null, out: null },
      ];
      const ctx = mockContext();
      element.draw(ctx);
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.bezierCurveTo).not.toHaveBeenCalled();
    });
  });

  describe("serialize/deserialize com bezier", () => {
    it("serialize preserva handles", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: { x: -5, y: -5 }, out: { x: 5, y: 5 } },
      ];
      const data: IPathElementData = element.serialize();
      expect(data.points[0].center).toEqual({ x: 0, y: 0 });
      expect(data.points[0].out).toEqual({ x: 5, y: 5 });
    });

    it("deserialize preserva pontos no formato center/in/out", () => {
      const data: IPathElementData = {
        type: "path",
        position: { x: 100, y: 200 },
        scale: { x: 1, y: 1 },
        size: { width: 10, height: 10 },
        rotation: 0,
        opacity: 1,
        zDepth: 5,
        isLocked: false,
        isVisible: true,
        layerName: "",
        filters: [],
        points: [
          { center: { x: 0, y: 0 }, in: null, out: null },
          { center: { x: 10, y: 10 }, in: null, out: null },
        ],
        isClosed: false,
        fillColor: "#E0E0E0",
        hasFill: false,
        strokeColor: "#202020",
        hasStroke: true,
        strokeWidth: 3,
        lineCap: "round",
        lineJoin: "miter",
        lineDash: "solid",
        miterLimit: 10,
      };
      element.deserialize(data);
      expect(element.points[0].center).toEqual({ x: 0, y: 0 });
      expect(element.points[0]).not.toHaveProperty("x");
    });
  });
});
