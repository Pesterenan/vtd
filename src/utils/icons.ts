import type { Position } from "src/components/types";
import { toRadians } from "./angles";

export const ICON_SIZE = 24;

export type Matrix2D = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

const IDENTITY: Matrix2D = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

const SKIPPABLE = new Set(["defs", "mask", "style", "title", "desc"]);

/** m = m × n (pós-multiplicação, igual à lista do SVG: aplica da esquerda pra direita) */
function applyTransform(m: Matrix2D, n: Matrix2D): void {
  const { a, b, c, d, e, f } = m;
  m.a = a * n.a + c * n.b;
  m.b = b * n.a + d * n.b;
  m.c = a * n.c + c * n.d;
  m.d = b * n.c + d * n.d;
  m.e = a * n.e + c * n.f + e;
  m.f = b * n.e + d * n.f + f;
}

/** Interpreta o atributo SVG `transform` (ex.: "rotate(45)") em uma matriz afim. */
export function parseSvgTransform(transform: string | null): Matrix2D {
  const m = { ...IDENTITY };
  if (!transform) return m;

  const fnRe = /([a-zA-Z]+)\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = fnRe.exec(transform)) !== null) {
    const name = match[1];
    const values = match[2]
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    switch (name) {
      case "matrix":
        applyTransform(m, {
          a: values[0],
          b: values[1],
          c: values[2],
          d: values[3],
          e: values[4],
          f: values[5],
        });
        break;
      case "translate":
        m.e += values[0];
        m.f += values[1] ?? 0;
        break;
      case "scale":
        applyTransform(m, {
          a: values[0],
          b: 0,
          c: 0,
          d: values[1] ?? values[0],
          e: 0,
          f: 0,
        });
        break;
      case "rotate": {
        const angle = (values[0] * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const cx = values[1];
        const cy = values[2];
        if (cx !== undefined && cy !== undefined) {
          // rotate(a, cx, cy) = translate(cx,cy) · rotate(a) · translate(-cx,-cy)
          applyTransform(m, { a: 1, b: 0, c: 0, d: 1, e: cx, f: cy });
          applyTransform(m, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 });
          applyTransform(m, { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy });
        } else {
          applyTransform(m, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 });
        }
        break;
      }
      case "skewX":
        applyTransform(m, {
          a: 1,
          b: 0,
          c: Math.tan((values[0] * Math.PI) / 180),
          d: 1,
          e: 0,
          f: 0,
        });
        break;
      case "skewY":
        applyTransform(m, {
          a: 1,
          b: Math.tan((values[0] * Math.PI) / 180),
          c: 0,
          d: 1,
          e: 0,
          f: 0,
        });
        break;
    }
  }
  return m;
}

function buildShape(el: Element): Path2D {
  const p = new Path2D();
  switch (el.tagName.toLowerCase()) {
    case "path":
      return new Path2D(el.getAttribute("d") ?? "");
    case "circle":
      p.arc(
        Number(el.getAttribute("cx")),
        Number(el.getAttribute("cy")),
        Number(el.getAttribute("r")),
        0,
        Math.PI * 2,
      );
      return p;
    case "rect":
      p.rect(
        Number(el.getAttribute("x")) || 0,
        Number(el.getAttribute("y")) || 0,
        Number(el.getAttribute("width")) || 0,
        Number(el.getAttribute("height")) || 0,
      );
      return p;
    case "ellipse":
      p.ellipse(
        Number(el.getAttribute("cx")),
        Number(el.getAttribute("cy")),
        Number(el.getAttribute("rx")),
        Number(el.getAttribute("ry")),
        0,
        0,
        Math.PI * 2,
      );
      return p;
    case "polygon":
    case "polyline": {
      const pts = (el.getAttribute("points") ?? "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      p.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
      if (el.tagName.toLowerCase() === "polygon") p.closePath();
      return p;
    }
    case "line":
      p.moveTo(Number(el.getAttribute("x1")), Number(el.getAttribute("y1")));
      p.lineTo(Number(el.getAttribute("x2")), Number(el.getAttribute("y2")));
      return p;
    default:
      return p;
  }
}

function collect(el: Element, matrix: Matrix2D, target: Path2D): void {
  const m = { ...matrix };
  applyTransform(m, parseSvgTransform(el.getAttribute("transform")));

  if (el.tagName.toLowerCase() === "g") {
    for (const child of Array.from(el.children)) {
      if (SKIPPABLE.has(child.tagName.toLowerCase())) continue;
      collect(child, m, target);
    }
    return;
  }

  const shape = buildShape(el);
  target.addPath(shape, new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]));
}

/**
 * Converte qualquer SVG de ícone em um Path2D único.
 * Shapes pretos (fill="black") dentro de <mask> viram subpaths de "furo"
 * — pinte com a regra "evenodd" para obter o recorte (ex.: lupa do zoom).
 */
export function svgToCanvasPath(svg: string): Path2D {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  const outline = new Path2D();

  for (const child of Array.from(root.children)) {
    if (SKIPPABLE.has(child.tagName.toLowerCase())) continue;
    collect(child, IDENTITY, outline);
  }

  for (const mask of Array.from(doc.querySelectorAll("mask"))) {
    for (const el of Array.from(mask.children)) {
      const fill = (el.getAttribute("fill") ?? "").toLowerCase();
      if (fill === "black" || fill === "#000") {
        collect(el, IDENTITY, outline);
      }
    }
  }

  return outline;
}

export type DrawCursorIconOptions = {
  offset?: Position;
  rotationDeg?: number;
  fill?: string;
  fillRule?: CanvasFillRule;
};

export function drawCursorIcon(
  ctx: CanvasRenderingContext2D,
  icon: Path2D,
  mousePos: Position,
  options: DrawCursorIconOptions = {},
): void {
  const {
    offset = { x: -ICON_SIZE / 2, y: -ICON_SIZE / 2 },
    rotationDeg = 0,
    fill = "grey",
    fillRule = "nonzero",
  } = options;
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "white";
  ctx.fillStyle = fill;
  ctx.translate(mousePos.x + offset.x, mousePos.y + offset.y);
  if (rotationDeg !== 0) ctx.rotate(toRadians(rotationDeg));

  ctx.stroke(icon);
  ctx.fill(icon, fillRule);
  ctx.restore();
}

