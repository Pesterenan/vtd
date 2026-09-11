import {
  cubicBezierPoint,
  closestPointOnCubicBezier,
  hitTestPathSegments,
  hitTestSegments,
} from "./pathMath";
import type { Point } from "src/components/types";

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

    // Prova do problema antigo: só com centros (reta), o mesmo mouse erra.
    const onChord = hitTestSegments(
      { x: 50, y: 75 },
      curvePoints().map((p) => p.center),
      false,
      8,
    );
    expect(onChord).toBeNull();
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
