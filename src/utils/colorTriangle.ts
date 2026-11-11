import type { Position } from "src/components/types";
import { hslToHex, parseHex, toHex } from "./color";
import { TRIANGLE_RADIUS, WHEEL_SIZE, hueToPoint } from "./wheel";

/**
 * Pesos do triângulo: quanto de cor pura, branco e preto compõem a cor final.
 *
 * A soma é sempre 1. Equivale ao HSV: `pure = V * S`, `white = V * (1 - S)` e
 * `black = 1 - V`.
 */
export type ColorWeights = { pure: number; white: number; black: number };

export type ColorTriangle = {
  pure: Position;
  white: Position;
  black: Position;
};

const EDGE_TOLERANCE = 1e-6;

/**
 * Vértices do triângulo girados de acordo com o hue: a ponta (`pure`) fica na
 * direção do indicador do anel, o branco à esquerda da base e o preto à direita.
 */
export const triangleForHue = (
  hue: number,
  radius = TRIANGLE_RADIUS,
): ColorTriangle => ({
  pure: hueToPoint(hue, radius),
  white: hueToPoint(hue + 240, radius),
  black: hueToPoint(hue + 120, radius),
});

/** Triângulo na orientação local, com a ponta para cima (`hue = 0`). */
export const UPWARD_TRIANGLE = triangleForHue(0);

const cross = (a: Position, b: Position, c: Position): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

/**
 * Pesos baricêntricos de `point` dentro do triângulo, ou `null` se o ponto
 * estiver fora. É o que converte um clique no triângulo em cor.
 */
export const barycentricWeights = (
  point: Position,
  triangle: ColorTriangle = UPWARD_TRIANGLE,
): ColorWeights | null => {
  const { pure, white, black } = triangle;
  const area = cross(pure, white, black);
  if (area === 0) return null;

  const pureWeight = cross(point, white, black) / area;
  const whiteWeight = cross(pure, point, black) / area;
  const blackWeight = cross(pure, white, point) / area;

  if (
    pureWeight < -EDGE_TOLERANCE ||
    whiteWeight < -EDGE_TOLERANCE ||
    blackWeight < -EDGE_TOLERANCE
  ) {
    return null;
  }

  // Cliques na borda podem dar somas levemente fora de 1 por arredondamento.
  const total = pureWeight + whiteWeight + blackWeight;
  return {
    pure: Math.max(0, pureWeight) / total,
    white: Math.max(0, whiteWeight) / total,
    black: Math.max(0, blackWeight) / total,
  };
};

/** Converte uma cor hex nos pesos equivalentes do triângulo (via HSV). */
export const weightsFromHex = (hex: string): ColorWeights => {
  const { r, g, b } = parseHex(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const saturation = max === 0 ? 0 : (max - min) / max;
  return {
    pure: max * saturation,
    white: max * (1 - saturation),
    black: 1 - max,
  };
};

/** Monta a cor a partir do hue e dos pesos do triângulo. */
export const hexFromWeights = (hue: number, weights: ColorWeights): string => {
  const pure = parseHex(hslToHex({ h: hue, s: 100, l: 50 }));
  return toHex(
    pure.r * weights.pure + 255 * weights.white,
    pure.g * weights.pure + 255 * weights.white,
    pure.b * weights.pure + 255 * weights.white,
  );
};

/** Posição do indicador correspondente aos pesos, dentro do triângulo. */
export const pointFromWeights = (
  weights: ColorWeights,
  triangle: ColorTriangle,
): Position => ({
  x:
    triangle.pure.x * weights.pure +
    triangle.white.x * weights.white +
    triangle.black.x * weights.black,
  y:
    triangle.pure.y * weights.pure +
    triangle.white.y * weights.white +
    triangle.black.y * weights.black,
});

export type TriangleMask = {
  resolution: number;
  /** Peso da cor pura por pixel; `-1` marca pixel fora do triângulo. */
  pure: Float32Array;
  white: Float32Array;
};

let cachedMask: TriangleMask | null = null;

/**
 * Pré-calcula os pesos de cada pixel do triângulo "ponta para cima".
 *
 * Os pesos não dependem do hue, então esse trabalho é feito uma vez só; pintar
 * uma nova cor reaproveita a máscara.
 */
export const buildTriangleMask = (resolution = WHEEL_SIZE): TriangleMask => {
  const scale = resolution / WHEEL_SIZE;
  const triangle: ColorTriangle = {
    pure: {
      x: UPWARD_TRIANGLE.pure.x * scale,
      y: UPWARD_TRIANGLE.pure.y * scale,
    },
    white: {
      x: UPWARD_TRIANGLE.white.x * scale,
      y: UPWARD_TRIANGLE.white.y * scale,
    },
    black: {
      x: UPWARD_TRIANGLE.black.x * scale,
      y: UPWARD_TRIANGLE.black.y * scale,
    },
  };

  const pure = new Float32Array(resolution * resolution).fill(-1);
  const white = new Float32Array(resolution * resolution);

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const weights = barycentricWeights(
        { x: x + 0.5, y: y + 0.5 },
        triangle,
      );
      if (!weights) continue;
      const index = y * resolution + x;
      pure[index] = weights.pure;
      white[index] = weights.white;
    }
  }

  return { resolution, pure, white };
};

export const getTriangleMask = (): TriangleMask =>
  (cachedMask ??= buildTriangleMask());

/**
 * Pinta o triângulo no canvas para o `hue` informado, na orientação local
 * ("ponta para cima"). A rotação fica por conta de quem desenha.
 */
export const paintTriangle = (
  context: CanvasRenderingContext2D,
  hue: number,
  mask: TriangleMask = getTriangleMask(),
): void => {
  const { resolution } = mask;
  const pure = parseHex(hslToHex({ h: hue, s: 100, l: 50 }));
  const image = context.createImageData(resolution, resolution);
  const { data } = image;

  for (let index = 0; index < mask.pure.length; index++) {
    const pureWeight = mask.pure[index];
    if (pureWeight < 0) continue;

    const whiteWeight = mask.white[index];
    const offset = index * 4;
    data[offset] = pure.r * pureWeight + 255 * whiteWeight;
    data[offset + 1] = pure.g * pureWeight + 255 * whiteWeight;
    data[offset + 2] = pure.b * pureWeight + 255 * whiteWeight;
    data[offset + 3] = 255;
  }

  context.putImageData(image, 0, 0);
};
