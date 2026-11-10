export type RGB = {
  r: number;
  g: number;
  b: number;
};

export type HSL = {
  h: number;
  s: number;
  l: number;
};

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_PATTERN.test(value);
}

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

/**
 * Converte HSL para `#RRGGBB`.
 *
 * `h` fica em graus (0–360) e `s`/`l` em percentual (0–100). Cores acromáticas
 * retornam `h = 0` e `s = 0`.
 */
export function hslToHex(hsl: HSL): string {
  const { h, s, l } = hsl;
  const hue = ((h % 360) + 360) % 360;
  const sat = s / 100;
  const light = l / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const hPrime = hue / 60;
  const x = chroma * (1 - Math.abs((hPrime % 2) - 1));
  const m = light - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  const sector = Math.floor(hPrime);
  switch (sector) {
    default:
    case 0:
      red = chroma;
      green = x;
      blue = 0;
      break;
    case 1:
      red = x;
      green = chroma;
      blue = 0;
      break;
    case 2:
      red = 0;
      green = chroma;
      blue = x;
      break;
    case 3:
      red = 0;
      green = x;
      blue = chroma;
      break;
    case 4:
      red = x;
      green = 0;
      blue = chroma;
      break;
    case 5:
      red = chroma;
      green = 0;
      blue = x;
      break;
  }

  return toHex((red + m) * 255, (green + m) * 255, (blue + m) * 255);
}

/**
 * Converte `#RRGGBB` para HSL.
 *
 * `h` fica em graus (0–360) e `s`/`l` em percentual (0–100). Cores acromáticas
 * retornam `h = 0` e `s = 0`.
 */
export function hexToHsl(hex: string): HSL {
  const { r, g, b } = parseHex(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));

  let hue: number;
  if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  hue *= 60;
  if (hue < 0) hue += 360;

  return {
    h: hue,
    s: saturation * 100,
    l: lightness * 100,
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

/**
 * Cores ativas de preenchimento e contorno.
 *
 * O par é global ao app e persistido no `localStorage`: sem seleção, ele serve
 * de padrão para novos elementos; com seleção, o ToolMenu espelha as cores do
 * elemento selecionado e edita o próprio elemento.
 */

export type ColorSlot = "fill" | "stroke";

export interface ActiveColors {
  fill: string;
  stroke: string;
}

export type ColorsStorage = Pick<Storage, "getItem" | "setItem">;

export const DEFAULT_ACTIVE_COLORS: ActiveColors = {
  fill: "#E0E0E0",
  stroke: "#202020",
};

export const ACTIVE_COLORS_STORAGE_KEY = "vtd:active-colors";

const getBrowserStorage = (): ColorsStorage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export class ActiveColorsStore {
  private colors: ActiveColors;
  private listeners = new Set<(colors: ActiveColors) => void>();

  public constructor(
    private storage: ColorsStorage | null = getBrowserStorage(),
  ) {
    this.colors = this.read();
  }

  public get(): ActiveColors {
    return { ...this.colors };
  }

  public set(slot: ColorSlot, value: string): ActiveColors {
    if (!isHexColor(value) || this.colors[slot] === value) {
      return this.get();
    }
    this.colors = { ...this.colors, [slot]: value };
    this.write();
    this.notify();
    return this.get();
  }

  public swap(): ActiveColors {
    this.colors = { fill: this.colors.stroke, stroke: this.colors.fill };
    this.write();
    this.notify();
    return this.get();
  }

  public reset(colors: ActiveColors = DEFAULT_ACTIVE_COLORS): ActiveColors {
    this.colors = { ...colors };
    this.write();
    this.notify();
    return this.get();
  }

  public subscribe(listener: (colors: ActiveColors) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private read(): ActiveColors {
    let raw: string | null = null;
    try {
      raw = this.storage?.getItem(ACTIVE_COLORS_STORAGE_KEY) ?? null;
    } catch {
      return { ...DEFAULT_ACTIVE_COLORS };
    }
    if (!raw) return { ...DEFAULT_ACTIVE_COLORS };

    try {
      const parsed = JSON.parse(raw) as Partial<ActiveColors>;
      return {
        fill: isHexColor(parsed.fill)
          ? parsed.fill
          : DEFAULT_ACTIVE_COLORS.fill,
        stroke: isHexColor(parsed.stroke)
          ? parsed.stroke
          : DEFAULT_ACTIVE_COLORS.stroke,
      };
    } catch {
      return { ...DEFAULT_ACTIVE_COLORS };
    }
  }

  private write(): void {
    try {
      this.storage?.setItem(
        ACTIVE_COLORS_STORAGE_KEY,
        JSON.stringify(this.colors),
      );
    } catch {
      // localStorage indisponível (modo privado, cota cheia): segue em memória.
    }
  }

  private notify(): void {
    const snapshot = this.get();
    for (const listener of this.listeners) listener(snapshot);
  }
}

export const activeColors = new ActiveColorsStore();
