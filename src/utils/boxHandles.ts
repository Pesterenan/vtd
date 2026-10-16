import type { Position } from "src/components/types";

export type BoxHandleKeys =
  | "BOTTOM"
  | "BOTTOM_LEFT"
  | "BOTTOM_RIGHT"
  | "CENTER"
  | "LEFT"
  | "RIGHT"
  | "TOP"
  | "TOP_LEFT"
  | "TOP_RIGHT";

export function resolveHandleSign(
  handle: BoxHandleKeys | null,
  handles: Record<BoxHandleKeys, Position> | null,
) {
  let anchor: Position = { x: 0, y: 0 };
  let xSign: 1 | 0 | -1 = 1;
  let ySign: 1 | 0 | -1 = 1;

  if (!handles || !handle) return { anchor, xSign, ySign };

  switch (handle) {
    case "TOP_LEFT":
      xSign = -1;
      ySign = -1;
      anchor = handles.BOTTOM_RIGHT;
      break;
    case "TOP_RIGHT":
      xSign = 1;
      ySign = -1;
      anchor = handles.BOTTOM_LEFT;
      break;
    case "BOTTOM_RIGHT":
      xSign = 1;
      ySign = 1;
      anchor = handles.TOP_LEFT;
      break;
    case "BOTTOM_LEFT":
      xSign = -1;
      ySign = 1;
      anchor = handles.TOP_RIGHT;
      break;
    case "TOP":
      xSign = 0;
      ySign = -1;
      anchor = handles.BOTTOM;
      break;
    case "RIGHT":
      xSign = 1;
      ySign = 0;
      anchor = handles.LEFT;
      break;
    case "BOTTOM":
      xSign = 0;
      ySign = 1;
      anchor = handles.TOP;
      break;
    case "LEFT":
      xSign = -1;
      ySign = 0;
      anchor = handles.RIGHT;
      break;
    case "CENTER":
      xSign = 0;
      ySign = 0;
      anchor = handles.CENTER;
      break;
  }
  return { anchor, xSign, ySign };
}
