import type { Point, Position } from "src/components/types";
import { clamp } from "src/utils/easing";

/** Ponto mais próximo de `p` sobre o segmento A-B (com clamp em [0,1]). */
export function closestPointOnSegment(
  p: Position,
  a: Position,
  b: Position,
): { t: number; q: Position; dist: number; distSq: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;

  const abLenSq = abx * abx + aby * aby; // |AB|²

  // Segmento degenerado (A == B)
  if (abLenSq < 1e-9) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return {
      t: 0,
      q: { ...a },
      dist: Math.hypot(dx, dy),
      distSq: dx * dx + dy * dy,
    };
  }

  // t = dot(AP, AB) / |AB|²  — fração ao longo de AB
  const t = (apx * abx + apy * aby) / abLenSq;
  const tClamped = clamp(t, 0, 1);

  const qx = a.x + abx * tClamped;
  const qy = a.y + aby * tClamped;
  const dx = p.x - qx;
  const dy = p.y - qy;

  return {
    t: tClamped,
    q: { x: qx, y: qy },
    dist: Math.hypot(dx, dy),
    distSq: dx * dx + dy * dy,
  };
}

/** Distância perpendicular de p ao segmento A-B (com clamp). */
export function distanceToSegment(
  p: Position,
  a: Position,
  b: Position,
): number {
  return closestPointOnSegment(p, a, b).dist;
}

/**
 * Encontra o segmento mais próximo do mouse dentro da tolerância.
 * `points` e `mouse` devem estar no MESMO espaço (screen ou world).
 */
export function hitTestSegments(
  mouse: Position,
  points: Position[],
  isClosed: boolean,
  tolerancePx = 8,
): {
  segmentIndex: number;
  projection: Position;
  t: number;
  distance: number;
} | null {
  if (points.length < 2) return null;

  const nSegs = isClosed ? points.length : points.length - 1;
  let best: {
    segmentIndex: number;
    projection: Position;
    t: number;
    distance: number;
  } | null = null;
  let bestDist = Infinity;

  for (let i = 0; i < nSegs; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const hit = closestPointOnSegment(mouse, a, b);

    if (hit.dist <= tolerancePx && hit.dist < bestDist) {
      bestDist = hit.dist;
      best = {
        segmentIndex: i,
        projection: hit.q,
        t: hit.t,
        distance: hit.dist,
      };
    }
  }
  return best;
}

/** Interpolação linear entre dois pontos (alias para lerp). */
export function lerpPoint(a: Position, b: Position, t: number): Position {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Avalia a cúbica de Bézier em `t` (mesma convenção do draw: p0 -> c1 -> c2 -> p1). */
export function cubicBezierPoint(
  p0: Position,
  c1: Position,
  c2: Position,
  p1: Position,
  t: number,
): Position {
  const u = clamp(t, 0, 1);
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p1.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p1.y,
  };
}

/**
 * Ponto mais próximo de `p` sobre a cúbica (p0, c1, c2, p1).
 * Achata a curva em `samples` subsegmentos, pega a melhor amostra e
 * refina projetando sobre os subsegmentos vizinhos. `t` é invariante
 * a transformações afins (zoom/pan), então vale em world e em screen.
 */
export function closestPointOnCubicBezier(
  p: Position,
  p0: Position,
  c1: Position,
  c2: Position,
  p1: Position,
  samples = 20,
): { t: number; q: Position; dist: number; distSq: number } {
  const n = Math.max(4, Math.floor(samples));
  let bestT = 0;
  let bestDistSq = Infinity;
  // Amostras (inclui t=0 e t=1); guarda para o refino.
  const pts: Position[] = new Array(n + 1);
  for (let k = 0; k <= n; k++) {
    const q = cubicBezierPoint(p0, c1, c2, p1, k / n);
    pts[k] = q;
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestT = k / n;
    }
  }
  // Refina: projeta sobre os subsegmentos ao redor da melhor amostra.
  const bestK = Math.round(bestT * n);
  let q = pts[bestK];
  let distSq = bestDistSq;
  let t = bestT;
  for (const k of [bestK - 1, bestK]) {
    if (k < 0 || k >= n) continue;
    const hit = closestPointOnSegment(p, pts[k], pts[k + 1]);
    if (hit.distSq < distSq) {
      distSq = hit.distSq;
      q = hit.q;
      t = (k + hit.t) / n;
    }
  }
  return { t, q, dist: Math.sqrt(distSq), distSq };
}

/**
 * Encontra o segmento mais próximo do mouse dentro da tolerância,
 * seguindo a curva de Bézier quando há handles (`out`/`in`) e a reta
 * quando o trecho é corner — igual ao que `drawPath` renderiza.
 * `points` e `mouse` devem estar no MESMO espaço (screen ou world).
 */
export function hitTestPathSegments(
  mouse: Position,
  points: Point[],
  isClosed: boolean,
  tolerancePx = 8,
  samples = 20,
): {
  segmentIndex: number;
  projection: Position;
  t: number;
  distance: number;
} | null {
  if (points.length < 2) return null;

  const nSegs = isClosed ? points.length : points.length - 1;
  let best: {
    segmentIndex: number;
    projection: Position;
    t: number;
    distance: number;
  } | null = null;
  let bestDist = Infinity;

  for (let i = 0; i < nSegs; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const p0 = a.center;
    const p1 = b.center;
    const c1 = a.out ?? p0;
    const c2 = b.in ?? p1;

    const hit =
      a.out || b.in
        ? closestPointOnCubicBezier(mouse, p0, c1, c2, p1, samples)
        : closestPointOnSegment(mouse, p0, p1);

    if (hit.dist <= tolerancePx && hit.dist < bestDist) {
      bestDist = hit.dist;
      best = {
        segmentIndex: i,
        projection: hit.q,
        t: hit.t,
        distance: hit.dist,
      };
    }
  }
  return best;
}

/** Constraint aos eixos H/V dominante (Photoshop sem 45°). */
export function constrainAxis(
  position: Position,
  reference: Position,
): Position {
  if (Math.abs(position.x - reference.x) >= Math.abs(position.y - reference.y)) {
    return { x: position.x, y: reference.y };
  }
  return { x: reference.x, y: position.y };
}

/** Snap a múltiplos de 45° preservando distância (8 direções). */
export function snapTo45(mouse: Position, origin: Position): Position {
  const dx = mouse.x - origin.x;
  const dy = mouse.y - origin.y;
  const ang = Math.atan2(dy, dx);
  const dist = Math.hypot(dx, dy);
  const step = Math.PI / 4; // 45°
  const snapped = Math.round(ang / step) * step;
  return {
    x: origin.x + Math.cos(snapped) * dist,
    y: origin.y + Math.sin(snapped) * dist,
  };
}
