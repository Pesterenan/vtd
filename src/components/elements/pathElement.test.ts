/**
 * @vitest-environment jsdom
 */
import type {
  IPathElementData,
  Point,
  Position,
  Size,
} from "src/components/types";
import { BoundingBox } from "src/utils/boundingBox";
import { rotatePoint } from "src/utils/transforms";
import { PathElement } from "./pathElement";

describe("PathElement", () => {
  const position: Position = { x: 100, y: 200 };
  const initialSize: Size = { width: 300, height: 150 };
  const zIndex = 5;
  let element: PathElement;

  beforeEach(() => {
    element = new PathElement(position, initialSize, zIndex);
  });

  describe("basic properties", () => {
    it("should initialize with type 'path'", () => {
      const data = element.serialize();
      expect(data.type).toBe("path");
    });

    it("should add the first point at the element position in local coordinates", () => {
      expect(element.points).toEqual([
        { center: { x: 0, y: 0 }, in: null, out: null },
      ]);
      expect(element.points[0].center).toEqual(
        element.toLocal(position).center,
      );
    });

    it("should allow setting points", () => {
      element.points = [
        { center: { x: 0, y: -50 }, in: null, out: null },
        { center: { x: 100, y: 50 }, in: null, out: null },
      ];
      expect(element.points).toEqual([
        { center: { x: 0, y: -50 }, in: null, out: null },
        { center: { x: 100, y: 50 }, in: null, out: null },
      ]);
      expect(element.serialize().points).toEqual([
        { center: { x: 0, y: -50 }, in: null, out: null },
        { center: { x: 100, y: 50 }, in: null, out: null },
      ]);
    });

    it("should have default isClosed = false and allow toggling", () => {
      expect(element.isClosed).toBe(false);

      element.isClosed = true;
      expect(element.isClosed).toBe(true);
      expect(element.serialize().isClosed).toBe(true);
    });

    it("should have default fillColor '#E0E0E0' and allow changing", () => {
      expect(element.fillColor).toBe("#E0E0E0");

      element.fillColor = "#ff0000";
      expect(element.fillColor).toBe("#ff0000");
    });

    it("should have default hasFill = false and allow toggling", () => {
      expect(element.hasFill).toBe(false);

      element.hasFill = true;
      expect(element.hasFill).toBe(true);
    });

    it("should have default strokeColor '#202020' and allow changing", () => {
      expect(element.strokeColor).toBe("#202020");

      element.strokeColor = "#00ff00";
      expect(element.strokeColor).toBe("#00ff00");
    });

    it("should have default hasStroke = true and allow toggling", () => {
      expect(element.hasStroke).toBe(true);

      element.hasStroke = false;
      expect(element.hasStroke).toBe(false);
    });

    it("should have default strokeWidth 3 and allow changing", () => {
      expect(element.strokeWidth).toBe(3);

      element.strokeWidth = 10;
      expect(element.strokeWidth).toBe(10);
    });

    it("should ignore strokeWidth <= 0", () => {
      element.strokeWidth = 0;
      expect(element.strokeWidth).toBe(3);

      element.strokeWidth = -5;
      expect(element.strokeWidth).toBe(3);
    });

    it("should have default lineCap 'round' and allow changing", () => {
      expect(element.lineCap).toBe("round");

      element.lineCap = "square";
      expect(element.lineCap).toBe("square");
      expect(element.serialize().lineCap).toBe("square");
    });

    it("should have default lineJoin 'miter' and allow changing", () => {
      expect(element.lineJoin).toBe("miter");

      element.lineJoin = "bevel";
      expect(element.lineJoin).toBe("bevel");
      expect(element.serialize().lineJoin).toBe("bevel");
    });

    it("should have default lineDash 'solid' and allow changing", () => {
      expect(element.lineDash).toBe("solid");

      element.lineDash = "dashed";
      expect(element.lineDash).toBe("dashed");
      expect(element.serialize().lineDash).toBe("dashed");
    });

    it("should have default miterLimit 10 and allow changing", () => {
      expect(element.miterLimit).toBe(10);

      element.miterLimit = 25;
      expect(element.miterLimit).toBe(25);
      expect(element.serialize().miterLimit).toBe(25);
    });

    it("should ignore miterLimit <= 0", () => {
      element.miterLimit = 0;
      expect(element.miterLimit).toBe(10);

      element.miterLimit = -5;
      expect(element.miterLimit).toBe(10);
    });
  });

  describe("coordinate conversions", () => {
    it("toWorld adds the element position to a local point", () => {
      expect(
        element.toWorld({
          center: { x: 30, y: -40 },
          in: null,
          out: null,
        } as unknown as Point).center,
      ).toEqual({ x: 130, y: 160 });
    });

    it("toLocal subtracts the element position from a world position", () => {
      expect(element.toLocal({ x: 130, y: 160 }).center).toEqual({
        x: 30,
        y: -40,
      });
    });

    it("toWorld and toLocal round-trip", () => {
      const world = { x: 250, y: 80 };
      expect(element.toWorld(element.toLocal(world)).center).toEqual(world);
    });
  });

  describe("point mutation", () => {
    it("addPoint accepts world coordinates and appends local points", () => {
      element.addPoint({ x: 200, y: 250 });

      expect(element.points).toHaveLength(2);
      // Geometria preservada no mundo
      expect(element.toWorld(element.points[0]).center).toEqual({ x: 100, y: 200 });
      expect(element.toWorld(element.points[1]).center).toEqual({ x: 200, y: 250 });
      // position virou o centro dos extents x 0..100 e y 0..50
      expect(element.position).toEqual({ x: 150, y: 225 });
    });

    it("addPoint with an index inserts the point at that position", () => {
      element.addPoint({ x: 300, y: 200 }, 0);

      expect(element.points).toHaveLength(2);
      expect(element.position).toEqual({ x: 200, y: 200 });
      expect(element.toWorld(element.points[0]).center).toEqual({ x: 300, y: 200 });
      expect(element.toWorld(element.points[1]).center).toEqual({ x: 100, y: 200 });
    });

    it("updatePoint converts world coordinates to local and preserves geometry", () => {
      element.addPoint({ x: 200, y: 250 });
      element.updatePoint(1, { x: 150, y: 100 });

      expect(element.position).toEqual({ x: 125, y: 150 });
      expect(element.toWorld(element.points[0]).center).toEqual({ x: 100, y: 200 });
      expect(element.toWorld(element.points[1]).center).toEqual({ x: 150, y: 100 });
    });

    it("updatePoint with an out-of-range index does nothing", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 10, y: 10 }, in: null, out: null },
      ];
      element.updatePoint(5, { x: 999, y: 999 });

      expect(element.points).toEqual([
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 10, y: 10 }, in: null, out: null },
      ]);
    });

    it("removePoint removes the point and recenters", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 10, y: 10 }, in: null, out: null },
        { center: { x: 5, y: 20 }, in: null, out: null },
      ];
      element.removePoint(1);

      expect(element.points).toEqual([
        { center: { x: -2.5, y: -10 }, in: null, out: null },
        { center: { x: 2.5, y: 10 }, in: null, out: null },
      ]);
      expect(element.position).toEqual({ x: 102.5, y: 210 });
      expect(element.toWorld(element.points[0]).center).toEqual({ x: 100, y: 200 });
    });

    it("removePoint with an out-of-range index does nothing", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 10, y: 10 }, in: null, out: null },
      ];
      element.removePoint(9);

      expect(element.points).toEqual([
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 10, y: 10 }, in: null, out: null },
      ]);
    });
  });

  describe("recomputeBounds", () => {
    function renderPath(
      points: Point[],
      position: Position,
      scale: { x: number; y: number },
      rotation: number,
    ): Position[] {
      return points.map((pt) => {
        const scaled = {
          x: pt.center.x * scale.x,
          y: pt.center.y * scale.y,
        };
        const rotated = rotatePoint(scaled, { x: 0, y: 0 }, rotation);
        return { x: rotated.x + position.x, y: rotated.y + position.y };
      });
    }

    it("recenters position at the point extents and preserves world geometry", () => {
      element.points = [
        { center: { x: 30, y: -40 }, in: null, out: null },
        { center: { x: -20, y: 50 }, in: null, out: null },
      ];

      const worldBefore = element.points.map((p) => element.toWorld(p));

      element.recomputeBounds();

      expect(element.position).toEqual({ x: 105, y: 205 });
      expect(element.size).toEqual({ width: 50, height: 90 });
      expect(element.points.map((p) => element.toWorld(p))).toEqual(
        worldBefore,
      );
    });

    it("preserves the rendered geometry with scale and rotation", () => {
      const rotated = new PathElement(
        { x: 500, y: 300 },
        { width: 10, height: 10 },
        1,
      );
      rotated.scale = { x: 2, y: 1 };
      rotated.rotation = 90;
      rotated.points = [
        { center: { x: 10, y: 0 }, in: null, out: null },
        { center: { x: -10, y: 0 }, in: null, out: null },
        { center: { x: 0, y: 20 }, in: null, out: null },
      ];

      const before = renderPath(
        rotated.points,
        rotated.position,
        rotated.scale,
        rotated.rotation,
      );

      rotated.recomputeBounds();

      expect(
        renderPath(
          rotated.points,
          rotated.position,
          rotated.scale,
          rotated.rotation,
        ),
      ).toEqual(before);
      expect(rotated.position).toEqual({ x: 490, y: 300 });
      expect(rotated.size).toEqual({ width: 20, height: 20 });
    });

    it("does nothing with a single point", () => {
      const before = element.position;
      element.recomputeBounds();

      expect(element.position).toEqual(before);
      expect(element.points).toEqual([
        { center: { x: 0, y: 0 }, in: null, out: null },
      ]);
    });
  });

  describe("draw", () => {
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

    it("strokes the path when hasStroke is true", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 50, y: 0 }, in: null, out: null },
      ];
      const ctx = mockContext();

      element.draw(ctx);

      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("closes the path when isClosed is true", () => {
      element.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 50, y: 0 }, in: null, out: null },
        { center: { x: 50, y: 50 }, in: null, out: null },
      ];
      element.isClosed = true;
      const ctx = mockContext();

      element.draw(ctx);

      expect(ctx.closePath).toHaveBeenCalled();
    });

    it("does not draw when the element is hidden", () => {
      element.isVisible = false;
      const ctx = mockContext();

      element.draw(ctx);

      expect(ctx.stroke).not.toHaveBeenCalled();
    });
  });

  describe("getBoundingBox", () => {
    it("returns an updated BoundingBox instance", () => {
      const box = element.getBoundingBox();
      expect(box).toBeInstanceOf(BoundingBox);

      element.position = { x: 300, y: 400 };

      const box2 = element.getBoundingBox();
      expect(box2.center.x).toBe(300);
      expect(box2.center.y).toBe(400);
    });

    it("uses position and size as fallback when there is a single point", () => {
      const box = element.getBoundingBox();

      expect(box.center).toEqual(position);
      expect(box.topLeft.x).toEqual(position.x - initialSize.width / 2);
      expect(box.bottomRight.x).toEqual(position.x + initialSize.width / 2);
      expect(box.topLeft.y).toEqual(position.y - initialSize.height / 2);
      expect(box.bottomRight.y).toEqual(position.y + initialSize.height / 2);
    });

    it("uses the point extents to center the box at position + local center", () => {
      element.points = [
        { center: { x: 30, y: -40 }, in: null, out: null },
        { center: { x: -20, y: 50 }, in: null, out: null },
      ];

      const box = element.getBoundingBox();

      expect(box.center.x).toBeCloseTo(105);
      expect(box.center.y).toBeCloseTo(205);
      expect(box.topLeft.x).toEqual(80);
      expect(box.topLeft.y).toEqual(160);
      expect(box.bottomRight.x).toEqual(130);
      expect(box.bottomRight.y).toEqual(250);
    });

    it("uses position and size when there are no points", () => {
      element.points = [];

      const box = element.getBoundingBox();

      expect(box.center).toEqual(position);
      expect(box.topLeft.x).toEqual(position.x - initialSize.width / 2);
    });
  });

  describe("serialize/deserialize", () => {
    it("serializes to IPathElementData with all fields", () => {
      const data: IPathElementData = element.serialize();

      expect(data.type).toBe("path");
      expect(data.position).toEqual(position);
      expect(data.size).toEqual(initialSize);
      expect(data.zDepth).toBe(zIndex);

      expect(data.points).toEqual([
        { center: { x: 0, y: 0 }, in: null, out: null },
      ]);
      expect(data.isClosed).toBe(false);
      expect(data.fillColor).toBe("#E0E0E0");
      expect(data.hasFill).toBe(false);
      expect(data.strokeColor).toBe("#202020");
      expect(data.hasStroke).toBe(true);
      expect(data.strokeWidth).toBe(3);
      expect(data.lineCap).toBe("round");
      expect(data.lineJoin).toBe("miter");
      expect(data.lineDash).toBe("solid");
      expect(data.miterLimit).toBe(10);
    });

    it("deserializes and restores all properties", () => {
      const data: IPathElementData = {
        type: "path",
        position: { x: 200, y: 400 },
        scale: { x: 1, y: 1 },
        size: { width: 600, height: 300 },
        rotation: 0,
        opacity: 1,
        zDepth: 10,
        isLocked: false,
        isVisible: true,
        layerName: "",
        filters: [],
        points: [
          { center: { x: 50, y: -75 }, in: null, out: null },
          { center: { x: 100, y: 25 }, in: null, out: null },
        ],
        isClosed: true,
        fillColor: "#ffaa00",
        hasFill: true,
        strokeColor: "#0088cc",
        hasStroke: false,
        strokeWidth: 7,
        lineCap: "square",
        lineJoin: "round",
        lineDash: "dotted",
        miterLimit: 20,
      };

      element.deserialize(data);

      expect(element.position).toEqual({ x: 200, y: 400 });
      expect(element.size).toEqual({ width: 600, height: 300 });
      expect(element.zDepth).toBe(10);

      expect(element.points).toEqual([
        { center: { x: 50, y: -75 }, in: null, out: null },
        { center: { x: 100, y: 25 }, in: null, out: null },
      ]);
      expect(element.isClosed).toBe(true);
      expect(element.fillColor).toBe("#ffaa00");
      expect(element.hasFill).toBe(true);
      expect(element.strokeColor).toBe("#0088cc");
      expect(element.hasStroke).toBe(false);
      expect(element.strokeWidth).toBe(7);
      expect(element.lineCap).toBe("square");
      expect(element.lineJoin).toBe("round");
      expect(element.lineDash).toBe("dotted");
      expect(element.miterLimit).toBe(20);
    });

    it("remains a PathElement after a serialize/deserialize cycle", () => {
      element.lineCap = "square";
      element.lineJoin = "round";
      element.lineDash = "dashed";
      element.miterLimit = 30;
      const data = element.serialize();

      const cloned = new PathElement(position, initialSize, zIndex);
      cloned.deserialize({ ...data, type: "path" });

      expect(cloned.constructor.name).toBe("PathElement");
      expect(cloned.lineCap).toBe("square");
      expect(cloned.lineJoin).toBe("round");
      expect(cloned.lineDash).toBe("dashed");
      expect(cloned.miterLimit).toBe(30);
    });
  });
});
