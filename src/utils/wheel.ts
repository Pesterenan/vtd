import type { Position } from "src/components/types";
import { toDegrees, toRadians } from "./angles";

/** Lado da área do seletor, em unidades do viewBox. */
export const WHEEL_SIZE = 256;
/** Centro da roda. */
export const WHEEL_CENTER = WHEEL_SIZE / 2;
/** Raio em que os indicadores do anel de matiz são desenhados. */
export const RING_RADIUS = 112;
/** Tolerância de clique em torno de `RING_RADIUS`, igual à faixa pintada. */
export const RING_HIT_TOLERANCE = 16;
/** Circunraio do triângulo de saturação/luminosidade. */
export const TRIANGLE_RADIUS = 88;

/** Normaliza um ângulo em graus para o intervalo `[0, 360)`. */
export const normalizeHue = (hue: number): number => ((hue % 360) + 360) % 360;

/**
 * Converte um ponto do viewBox no hue correspondente.
 *
 * O hue 0 aponta para o topo e cresce no sentido horário, igual ao
 * `conic-gradient` que pinta o anel.
 */
export const pointToHue = (point: Position): number => {
  const dx = point.x - WHEEL_CENTER;
  const dy = point.y - WHEEL_CENTER;
  return normalizeHue(toDegrees(Math.atan2(dx, -dy)));
};

/** Converte um hue no ponto correspondente, a `radius` unidades do centro. */
export const hueToPoint = (hue: number, radius = RING_RADIUS): Position => {
  const radians = toRadians(hue);
  return {
    x: WHEEL_CENTER + radius * Math.sin(radians),
    y: WHEEL_CENTER - radius * Math.cos(radians),
  };
};

/**
 * Rotaciona `point` em torno do centro da roda.
 *
 * Ângulos positivos giram no sentido horário na tela, igual ao `rotate()` do
 * CSS — é o que permite testar cliques no triângulo em coordenadas locais
 * ("ponta para cima") com `-hue`.
 */
export const rotatePoint = (point: Position, degrees: number): Position => {
  const radians = toRadians(degrees);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - WHEEL_CENTER;
  const dy = point.y - WHEEL_CENTER;
  return {
    x: WHEEL_CENTER + dx * cos - dy * sin,
    y: WHEEL_CENTER + dx * sin + dy * cos,
  };
};
