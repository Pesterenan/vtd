import {
  ACTIVE_COLORS_STORAGE_KEY,
  ActiveColorsStore,
  DEFAULT_ACTIVE_COLORS,
  hexToHsl,
  hexToRgba,
  hslToHex,
  parseHex,
  toHex,
} from "./color";
import type { ColorsStorage } from "./color";

describe("parseHex", () => {
  it("should parse uppercase hex channels", () => {
    expect(parseHex("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("should parse lowercase hex case-insensitively", () => {
    expect(parseHex("#bababa")).toEqual({ r: 186, g: 186, b: 186 });
    expect(parseHex("#BaBaBa")).toEqual({ r: 186, g: 186, b: 186 });
  });

  it("should parse the black boundary", () => {
    expect(parseHex("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("Hipótese: should reject malformed hex input", () => {
    expect(() => parseHex("#fff")).toThrow();
  });
});

describe("hexToHsl", () => {
  it("should convert the primary colors", () => {
    expect(hexToHsl("#ff0000")).toEqual({ h: 0, s: 100, l: 50 });
    expect(hexToHsl("#00ff00")).toEqual({ h: 120, s: 100, l: 50 });
    expect(hexToHsl("#0000ff")).toEqual({ h: 240, s: 100, l: 50 });
  });

  it("should convert a secondary color", () => {
    expect(hexToHsl("#ffff00")).toEqual({ h: 60, s: 100, l: 50 });
  });

  it("should convert a mixed color", () => {
    const hsl = hexToHsl("#336699");
    expect(hsl.h).toBeCloseTo(210);
    expect(hsl.s).toBeCloseTo(50);
    expect(hsl.l).toBeCloseTo(40);
  });

  it("should return zero hue and saturation for grayscale", () => {
    expect(hexToHsl("#000000")).toEqual({ h: 0, s: 0, l: 0 });
    expect(hexToHsl("#ffffff")).toEqual({ h: 0, s: 0, l: 100 });

    const gray = hexToHsl("#bababa");
    expect(gray.h).toBe(0);
    expect(gray.s).toBe(0);
    expect(gray.l).toBeCloseTo(72.94, 2);
  });

  it("Hipótese: should reject malformed hex input", () => {
    expect(() => hexToHsl("#fff")).toThrow();
  });
});

describe("hslToHex", () => {
  it("should convert the primary colors", () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe("#ff0000");
    expect(hslToHex({ h: 120, s: 100, l: 50 })).toBe("#00ff00");
    expect(hslToHex({ h: 240, s: 100, l: 50 })).toBe("#0000ff");
  });

  it("should convert a secondary color", () => {
    expect(hslToHex({ h: 60, s: 100, l: 50 })).toBe("#ffff00");
  });

  it("should convert grayscale colors without saturation", () => {
    expect(hslToHex({ h: 0, s: 0, l: 0 })).toBe("#000000");
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe("#ffffff");
    expect(hslToHex({ h: 210, s: 0, l: 50 })).toBe("#808080");
  });

  it("should normalize hue out of the 0-360 range", () => {
    expect(hslToHex({ h: 360, s: 100, l: 50 })).toBe("#ff0000");
    expect(hslToHex({ h: -30, s: 100, l: 50 })).toBe("#ff0080");
  });

  it("should round-trip with hexToHsl", () => {
    const hexes = ["#336699", "#bababa", "#E0E0E0", "#202020", "#ff8800"];
    for (const hex of hexes) {
      expect(hslToHex(hexToHsl(hex))).toBe(hex.toLowerCase());
    }
  });
});

describe("toHex", () => {  it("should convert channel boundaries to lowercase hex", () => {
    expect(toHex(0, 0, 0)).toBe("#000000");
    expect(toHex(255, 255, 255)).toBe("#ffffff");
  });

  it("should pad single-digit channels with leading zero", () => {
    expect(toHex(1, 2, 3)).toBe("#010203");
  });

  it("should round and clamp out-of-range channels", () => {
    expect(toHex(300, -20, 127.5)).toBe("#ff0080");
  });
});

describe("hexToRgba", () => {
  it("should format rgba with the exact spacing of gradientElement", () => {
    expect(hexToRgba("#bababa", 1)).toBe("rgba(186, 186, 186, 1)");
    expect(hexToRgba("#000000", 0.5)).toBe("rgba(0, 0, 0, 0.5)");
  });

  it("should round-trip parseHex into toHex", () => {
    const parsed = parseHex("#bababa");
    expect(toHex(parsed.r, parsed.g, parsed.b)).toBe("#bababa");
    const upper = parseHex("#FFFFFF");
    expect(toHex(upper.r, upper.g, upper.b)).toBe("#ffffff");
  });
});

const createStorage = (initial: Record<string, string> = {}): ColorsStorage => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};

describe("ActiveColorsStore", () => {
  it("inicia com as cores padrão quando o storage está vazio", () => {
    const store = new ActiveColorsStore(createStorage());
    expect(store.get()).toEqual(DEFAULT_ACTIVE_COLORS);
  });

  it("persiste uma cor válida", () => {
    const storage = createStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const store = new ActiveColorsStore(storage);

    expect(store.set("fill", "#FF0000")).toEqual({
      ...DEFAULT_ACTIVE_COLORS,
      fill: "#FF0000",
    });
    expect(setItem).toHaveBeenCalledWith(
      ACTIVE_COLORS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_ACTIVE_COLORS, fill: "#FF0000" }),
    );
  });

  it("ignora valores que não são hexadecimais de seis dígitos", () => {
    const storage = createStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const store = new ActiveColorsStore(storage);

    store.set("stroke", "red");
    store.set("stroke", "#fff");
    store.set("stroke", "#GGGGGG");

    expect(store.get().stroke).toBe(DEFAULT_ACTIVE_COLORS.stroke);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("restaura cores persistidas", () => {
    const store = new ActiveColorsStore(
      createStorage({
        [ACTIVE_COLORS_STORAGE_KEY]: JSON.stringify({
          fill: "#112233",
          stroke: "#445566",
        }),
      }),
    );

    expect(store.get()).toEqual({ fill: "#112233", stroke: "#445566" });
  });

  it("usa o padrão por slot quando o JSON persistido é inválido", () => {
    const store = new ActiveColorsStore(
      createStorage({
        [ACTIVE_COLORS_STORAGE_KEY]: JSON.stringify({
          fill: "nope",
          stroke: "#445566",
        }),
      }),
    );

    expect(store.get()).toEqual({
      fill: DEFAULT_ACTIVE_COLORS.fill,
      stroke: "#445566",
    });
  });

  it("cai no padrão quando o storage não é JSON válido", () => {
    const store = new ActiveColorsStore(
      createStorage({ [ACTIVE_COLORS_STORAGE_KEY]: "{not json" }),
    );
    expect(store.get()).toEqual(DEFAULT_ACTIVE_COLORS);
  });

  it("notifica assinantes até o unsubscribe", () => {
    const store = new ActiveColorsStore(createStorage());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set("fill", "#123456");
    expect(listener).toHaveBeenCalledWith({
      ...DEFAULT_ACTIVE_COLORS,
      fill: "#123456",
    });

    unsubscribe();
    store.set("fill", "#654321");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("swap troca preenchimento e contorno e persiste", () => {
    const storage = createStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const store = new ActiveColorsStore(storage);
    store.set("fill", "#112233");
    store.set("stroke", "#445566");
    setItem.mockClear();

    expect(store.swap()).toEqual({ fill: "#445566", stroke: "#112233" });
    expect(store.get()).toEqual({ fill: "#445566", stroke: "#112233" });
    expect(setItem).toHaveBeenCalledWith(
      ACTIVE_COLORS_STORAGE_KEY,
      JSON.stringify({ fill: "#445566", stroke: "#112233" }),
    );
  });

  it("reset restaura e persiste o par informado", () => {
    const storage = createStorage();
    const store = new ActiveColorsStore(storage);
    store.set("fill", "#123456");

    expect(store.reset()).toEqual(DEFAULT_ACTIVE_COLORS);
    expect(store.get()).toEqual(DEFAULT_ACTIVE_COLORS);
  });
});
