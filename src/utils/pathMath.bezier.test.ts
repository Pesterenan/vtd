import {
  cubicBezierPoint,
  closestPointOnCubicBezier,
  hitTestPathSegments,
  traceSegment,
} from "./pathMath";
import type { Point, Position } from "src/components/types";

// Curva com barriga bem marcada: corda vai de (0,0) a (100,0),
// mas a curva passa por (50,75) em t=0.5.
const P0 = { x: 0, y: 0 };
const C1 = { x: 0, y: 100 };
const C2 = { x: 100, y: 100 };
const P1 = { x: 100, y: 0 };

function curvePoints(): Point[] {
  return [
    { center: P0, in: null, out: C1 },
    { center: P1, in: C2, out: null },
  ];
}

describe("cubicBezierPoint", () => {
  it("t=0 retorna p0 e t=1 retorna p1", () => {
    expect(cubicBezierPoint(P0, C1, C2, P1, 0)).toEqual(P0);
    expect(cubicBezierPoint(P0, C1, C2, P1, 1)).toEqual(P1);
  });

  it("t=0.5 passa pela barriga da curva, longe da corda", () => {
    const mid = cubicBezierPoint(P0, C1, C2, P1, 0.5);
    expect(mid.x).toBeCloseTo(50, 5);
    expect(mid.y).toBeCloseTo(75, 5);
  });
});

describe("closestPointOnCubicBezier", () => {
  it("ponto sobre a curva tem distância ~0 e t ~0.5", () => {
    const hit = closestPointOnCubicBezier({ x: 50, y: 75 }, P0, C1, C2, P1);
    expect(hit.dist).toBeLessThan(1);
    expect(hit.t).toBeCloseTo(0.5, 1);
  });
});

describe("hitTestPathSegments", () => {
  it("acerta a barriga da curva onde a reta não alcança", () => {
    const onCurve = hitTestPathSegments(
      { x: 50, y: 75 },
      curvePoints(),
      false,
      8,
    );
    expect(onCurve).not.toBeNull();
    expect(onCurve!.segmentIndex).toBe(0);
    expect(onCurve!.projection.x).toBeCloseTo(50, 0);
    expect(onCurve!.projection.y).toBeCloseTo(75, 0);
  });

  it("trecho corner continua funcionando como reta (regressão)", () => {
    const corners: Point[] = [
      { center: { x: 0, y: 0 }, in: null, out: null },
      { center: { x: 100, y: 0 }, in: null, out: null },
    ];
    const hit = hitTestPathSegments({ x: 50, y: 2 }, corners, false, 8);
    expect(hit).not.toBeNull();
    expect(hit!.segmentIndex).toBe(0);
  });

  it("mouse longe retorna null", () => {
    expect(
      hitTestPathSegments({ x: 200, y: 200 }, curvePoints(), false, 8),
    ).toBeNull();
  });
});

describe("traceSegment", () => {
  function makeContext(): CanvasRenderingContext2D {
    return document.createElement("canvas").getContext("2d")!;
  }

  function makePoint(
    center: Position,
    handleOut: Position | null = null,
    handleIn: Position | null = null,
  ): Point {
    return { center, in: handleIn, out: handleOut };
  }

  it("desenha reta quando nenhum dos pontos tem handle", () => {
    const ctx = makeContext();
    const lineToSpy = vi.spyOn(ctx, "lineTo").mockClear();
    const bezierSpy = vi.spyOn(ctx, "bezierCurveTo").mockClear();

    traceSegment(
      ctx,
      makePoint({ x: 0, y: 0 }),
      makePoint({ x: 10, y: 5 }),
    );

    expect(lineToSpy).toHaveBeenCalledWith(10, 5);
    expect(bezierSpy).not.toHaveBeenCalled();
  });

  it("desenha cúbica usando out do início e in do fim", () => {
    const ctx = makeContext();
    const bezierSpy = vi.spyOn(ctx, "bezierCurveTo").mockClear();

    traceSegment(ctx, curvePoints()[0], curvePoints()[1]);

    expect(bezierSpy).toHaveBeenCalledWith(C1.x, C1.y, C2.x, C2.y, P1.x, P1.y);
  });

  it("curva também quando só o fim tem handle in", () => {
    const ctx = makeContext();
    const bezierSpy = vi.spyOn(ctx, "bezierCurveTo").mockClear();

    traceSegment(
      ctx,
      makePoint({ x: 0, y: 0 }),
      makePoint({ x: 100, y: 0 }, null, { x: 100, y: 100 }),
    );

    // cp1 cai no próprio início quando não há out
    expect(bezierSpy).toHaveBeenCalledWith(0, 0, 100, 100, 100, 0);
  });
});
