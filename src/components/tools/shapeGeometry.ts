import type { Point, Position } from "../types";

export type ShapeBox = { x: number; y: number; w: number; h: number };
export type ShapeMode =
  "rectangle" | "ellipse" | "triangle" | "polygon" | "star";

const RADIUS_FACTOR = 0.5522847498;
const STAR_INNER_RATIO = 0.5;
export function normalizeBox(
  start: Position,
  end: Position,
  fromCenter = false,
): ShapeBox {
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);

  if (fromCenter) {
    const x = start.x - w;
    const y = start.y - h;
    return { x, y, w: 2 * w, h: 2 * h };
  }
  return { x: minX, y: minY, w, h };
}

export function lockBox(box: ShapeBox, _mode: ShapeMode): ShapeBox {
  const side = Math.max(box.w, box.h);
  return { x: box.x, y: box.y, w: side, h: side };
}

/** Vértices sobre a elipse inscrita na caixa, começando no topo. */
function polarPoints(
  box: ShapeBox,
  count: number,
  radiusAt: (index: number) => number,
): Point[] {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const rx = box.w / 2;
  const ry = box.h / 2;
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    const r = radiusAt(i);
    points.push({
      center: {
        x: cx + rx * r * Math.cos(angle),
        y: cy + ry * r * Math.sin(angle),
      },
      in: null,
      out: null,
    });
  }
  return points;
}

export function resolveShapeBox(
  start: Position,
  end: Position,
  options: { fromCenter?: boolean; square?: boolean; mode: ShapeMode },
): ShapeBox {
  const box = normalizeBox(start, end, options.fromCenter ?? false);
  return options.square ? lockBox(box, options.mode) : box;
}

export function buildShapePoints(
  mode: ShapeMode,
  { x, y, w, h }: ShapeBox,
  sides: number,
): Point[] {
  switch (mode) {
    // .x,y-----.xw,y
    // |        |
    // |        |
    // .x,yh____.xw,yh
    case "rectangle":
      return [
        { center: { x, y }, in: null, out: null },
        { center: { x: x + w, y }, in: null, out: null },
        { center: { x: x + w, y: y + h }, in: null, out: null },
        { center: { x, y: y + h }, in: null, out: null },
      ];
    //     xw/2,y
    //   /        \
    //x,yh/2      xw,yh/2
    //   \        /
    //     xw/2,yh
    case "ellipse": {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const kx = RADIUS_FACTOR * (w / 2);
      const ky = RADIUS_FACTOR * (h / 2);
      return [
        {
          center: { x: cx, y },
          in: { x: cx - kx, y },
          out: { x: cx + kx, y },
        },
        {
          center: { x: x + w, y: cy },
          in: { x: x + w, y: cy - ky },
          out: { x: x + w, y: cy + ky },
        },
        {
          center: { x: cx, y: y + h },
          in: { x: cx + kx, y: y + h },
          out: { x: cx - kx, y: y + h },
        },
        {
          center: { x, y: cy },
          in: { x, y: cy + ky },
          out: { x, y: cy - ky },
        },
      ];
    }
    case "triangle":
      return [
        { center: { x, y: y + h }, in: null, out: null },
        { center: { x: x + w / 2, y }, in: null, out: null },
        { center: { x: x + w, y: y + h }, in: null, out: null },
      ];
    case "polygon": {
      const count = Math.floor(sides);
      if (count < 3) break;
      return polarPoints({ x, y, w, h }, count, () => 1);
    }
    case "star": {
      const tips = Math.floor(sides);
      if (tips < 2) break;
      return polarPoints({ x, y, w, h }, tips * 2, (i) =>
        i % 2 === 0 ? 1 : STAR_INNER_RATIO,
      );
    }
    default:
      break;
  }
  return [];
}
