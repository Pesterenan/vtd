import type { Position } from "src/components/types";
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
