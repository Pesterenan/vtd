export type RGB = {
  r: number;
  g: number;
  b: number;
};

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function parseHex(hex: string): RGB {
  if (!HEX_PATTERN.test(hex)) {
    throw new Error(`Invalid hex color: "${hex}". Expected "#RRGGBB".`);
  }
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function toHex(r: number, g: number, b: number): string {
  const toByte = (value: number): string =>
    clampChannel(value).toString(16).padStart(2, "0");
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
