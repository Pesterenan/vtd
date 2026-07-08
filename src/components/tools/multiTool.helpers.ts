import { rotatePoint, toRadians } from "src/utils/transforms";
import type { Position } from "../types";

// Constants
export const GIZMO_LENGTH = 50;
export const ARROW_HEAD_SIZE = 10;
export const CENTER_SIZE = 6;
export const HANDLE_SIZE = 8;
export const ROTATE_RADIUS = 80;
export const HIT_THRESHOLD = 24;

export type GizmoPart = "xAxis" | "yAxis" | "center" | "rotateRing" | null;

// Select Gizmo
export function drawSelectGizmo(
  ctx: CanvasRenderingContext2D,
  startPosition: Position | null,
  endPosition: Position | null,
): void {
  if (!startPosition || !endPosition || !ctx) return;
  ctx.save();
  ctx.strokeStyle = "black";
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 2;
  ctx.strokeRect(
    startPosition.x,
    startPosition.y,
    endPosition.x - startPosition.x,
    endPosition.y - startPosition.y,
  );
  ctx.restore();
}

// Move Gizmo
export function drawMoveGizmo(
  ctx: CanvasRenderingContext2D,
  anchor: Position,
  zoomLevel: number,
  options: { isRelative: boolean; rotation: number },
): void {
  const len = GIZMO_LENGTH / zoomLevel;
  const head = ARROW_HEAD_SIZE / zoomLevel;
  const hc = CENTER_SIZE / zoomLevel;
  const lw = 2 / zoomLevel;

  ctx.save();
  ctx.lineWidth = lw;

  if (options.isRelative && options.rotation !== 0) {
    ctx.translate(anchor.x, anchor.y);
    ctx.rotate(toRadians(options.rotation));
    ctx.translate(-anchor.x, -anchor.y);
  }

  ctx.strokeStyle = "#ff4444";
  ctx.fillStyle = "#ff4444";
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y);
  ctx.lineTo(anchor.x + len, anchor.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(anchor.x + len, anchor.y);
  ctx.lineTo(anchor.x + len - head, anchor.y - head * 0.5);
  ctx.lineTo(anchor.x + len - head, anchor.y + head * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#44cc44";
  ctx.fillStyle = "#44cc44";
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y);
  ctx.lineTo(anchor.x, anchor.y - len);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y - len);
  ctx.lineTo(anchor.x - head * 0.5, anchor.y - len + head);
  ctx.lineTo(anchor.x + head * 0.5, anchor.y - len + head);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5 / zoomLevel;
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.fillRect(anchor.x - hc, anchor.y - hc, hc * 2, hc * 2);
  ctx.strokeRect(anchor.x - hc, anchor.y - hc, hc * 2, hc * 2);
  ctx.restore();
}

// Rotate Gizmo
export function drawRotateGizmo(
  ctx: CanvasRenderingContext2D,
  anchor: Position,
  zoomLevel: number,
  rotation: number,
): void {
  const radius = ROTATE_RADIUS / zoomLevel;

  ctx.save();
  ctx.strokeStyle = "#4488ff";
  ctx.lineWidth = 2 / zoomLevel;
  ctx.setLineDash([4 / zoomLevel, 4 / zoomLevel]);
  ctx.beginPath();
  ctx.arc(anchor.x, anchor.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);
  const angleRad = toRadians(rotation);
  const dotX = anchor.x + radius * Math.cos(angleRad);
  const dotY = anchor.y + radius * Math.sin(angleRad);
  ctx.fillStyle = "#4488ff";
  ctx.beginPath();
  ctx.arc(dotX, dotY, 4 / zoomLevel, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Scale Gizmo
export function drawScaleGizmo(
  ctx: CanvasRenderingContext2D,
  anchor: Position,
  zoomLevel: number,
  rotation: number,
): void {
  const len = GIZMO_LENGTH / zoomLevel;
  const hh = HANDLE_SIZE / zoomLevel;
  const hc = CENTER_SIZE / zoomLevel;
  const lw = 2 / zoomLevel;

  ctx.save();
  ctx.lineWidth = lw;

  if (rotation !== 0) {
    ctx.translate(anchor.x, anchor.y);
    ctx.rotate(toRadians(rotation));
    ctx.translate(-anchor.x, -anchor.y);
  }

  ctx.strokeStyle = "#ff4444";
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y);
  ctx.lineTo(anchor.x + len, anchor.y);
  ctx.stroke();
  ctx.fillStyle = "#ff4444";
  ctx.fillRect(anchor.x + len - hh, anchor.y - hh, hh * 2, hh * 2);

  ctx.strokeStyle = "#44cc44";
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y);
  ctx.lineTo(anchor.x, anchor.y - len);
  ctx.stroke();
  ctx.fillStyle = "#44cc44";
  ctx.fillRect(anchor.x - hh, anchor.y - len - hh, hh * 2, hh * 2);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5 / zoomLevel;
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.fillRect(anchor.x - hc, anchor.y - hc, hc * 2, hc * 2);
  ctx.strokeRect(anchor.x - hc, anchor.y - hc, hc * 2, hc * 2);
  ctx.restore();
}

export function getGizmoPartAt(
  mousePos: Position,
  anchor: Position,
  isRelativeMovement: boolean,
  rotation: number,
  zoomLevel: number,
): GizmoPart {
  let testPos = mousePos;
  if (isRelativeMovement && rotation !== 0) {
    testPos = rotatePoint(mousePos, anchor, -rotation);
  }
  const gizmoLen = GIZMO_LENGTH / zoomLevel;
  const threshold = HIT_THRESHOLD / zoomLevel;
  const hc = CENTER_SIZE / zoomLevel;

  if (
    testPos.x >= anchor.x - hc - threshold &&
    testPos.x <= anchor.x + hc + threshold &&
    testPos.y >= anchor.y - hc - threshold &&
    testPos.y <= anchor.y + hc + threshold
  ) {
    return "center";
  }

  if (
    testPos.y >= anchor.y - threshold &&
    testPos.y <= anchor.y + threshold &&
    testPos.x >= anchor.x - threshold &&
    testPos.x <= anchor.x + gizmoLen + threshold
  ) {
    return "xAxis";
  }

  if (
    testPos.x >= anchor.x - threshold &&
    testPos.x <= anchor.x + threshold &&
    testPos.y >= anchor.y - gizmoLen - threshold &&
    testPos.y <= anchor.y + threshold
  ) {
    return "yAxis";
  }

  const dist = Math.hypot(testPos.x - anchor.x, testPos.y - anchor.y);
  const radius = ROTATE_RADIUS / zoomLevel;
  if (Math.abs(dist - radius) < threshold) {
    return "rotateRing";
  }

  return null;
}
