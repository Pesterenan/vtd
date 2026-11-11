import { clamp } from "./easing";

export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

/**
 * Calcula a posição de um painel flutuante perto da âncora, mantendo-o dentro
 * da viewport.
 *
 * Tenta abrir abaixo da âncora; se não couber, abre acima. Na horizontal,
 * alinha pela esquerda e, se estourar a direita, alinha pela direita da âncora.
 * Em qualquer caso o resultado é preso à viewport com `margin` de folga.
 */
export const placeNearAnchor = (
  anchor: Rect,
  size: Size,
  viewport: Size,
  margin = 8,
): { left: number; top: number } => {
  const maxLeft = Math.max(margin, viewport.width - margin - size.width);
  const maxTop = Math.max(margin, viewport.height - margin - size.height);

  let left = anchor.left;
  if (left + size.width > viewport.width - margin) {
    left = anchor.right - size.width;
  }

  let top = anchor.bottom + margin;
  if (top + size.height > viewport.height - margin) {
    top = anchor.top - margin - size.height;
  }

  return {
    left: clamp(left, margin, maxLeft),
    top: clamp(top, margin, maxTop),
  };
};
