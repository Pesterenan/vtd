import { hexToRgba, parseHex, toHex } from "./color";

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

describe("toHex", () => {
  it("should convert channel boundaries to lowercase hex", () => {
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
