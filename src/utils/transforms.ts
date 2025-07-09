import type { Position } from "src/components/types";
import { Vector } from "./vector";

export const toRadians = (angleInDegrees: number): number => {
  return (Math.PI / 180) * angleInDegrees;
};

export const toDegrees = (angleInRadians: number): number => {
  return (angleInRadians * 180) / Math.PI;
};

export const rotatePoint = (
  point: Position,
  center: Position,
  angle: number,
): Position => {
  const radians = toRadians(angle);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const translated = new Vector(point).sub(center);
  const rotated = {
    x: translated.x * cos - translated.y * sin,
    y: translated.x * sin + translated.y * cos,
  };
  return new Vector(rotated).add(center);
};
