import {
  UPWARD_TRIANGLE,
  barycentricWeights,
  buildTriangleMask,
  hexFromWeights,
  paintTriangle,
  pointFromWeights,
  triangleForHue,
  weightsFromHex,
} from "./colorTriangle";
import type { TriangleMask } from "./colorTriangle";
import { hexToHsl } from "./color";
import { TRIANGLE_RADIUS, WHEEL_CENTER, hueToPoint } from "./wheel";

describe("triangleForHue", () => {
  it("deve apontar a ponta para o hue e colocar branco/preto na base", () => {
    const hue = 90;
    const triangle = triangleForHue(hue);

    expect(triangle.pure.x).toBeCloseTo(hueToPoint(hue, TRIANGLE_RADIUS).x, 6);
    expect(triangle.pure.y).toBeCloseTo(hueToPoint(hue, TRIANGLE_RADIUS).y, 6);
    expect(triangle.white.x).toBeCloseTo(hueToPoint(hue + 240, TRIANGLE_RADIUS).x, 6);
    expect(triangle.black.x).toBeCloseTo(hueToPoint(hue + 120, TRIANGLE_RADIUS).x, 6);
  });

  it("com hue 0 deve ficar com a ponta para cima e branco à esquerda", () => {
    expect(UPWARD_TRIANGLE.pure.y).toBeLessThan(WHEEL_CENTER);
    expect(UPWARD_TRIANGLE.pure.x).toBeCloseTo(WHEEL_CENTER, 6);
    expect(UPWARD_TRIANGLE.white.x).toBeLessThan(WHEEL_CENTER);
    expect(UPWARD_TRIANGLE.black.x).toBeGreaterThan(WHEEL_CENTER);
  });
});

describe("weightsFromHex", () => {
  it("deve mapear as âncoras do triângulo", () => {
    expect(weightsFromHex("#ff0000")).toEqual({ pure: 1, white: 0, black: 0 });
    expect(weightsFromHex("#ffffff")).toEqual({ pure: 0, white: 1, black: 0 });
    expect(weightsFromHex("#000000")).toEqual({ pure: 0, white: 0, black: 1 });
  });

  it("deve mapear um cinza para a aresta branco-preto", () => {
    const weights = weightsFromHex("#808080");
    expect(weights.pure).toBe(0);
    expect(weights.white).toBeCloseTo(128 / 255, 6);
    expect(weights.black).toBeCloseTo(1 - 128 / 255, 6);
  });
});

describe("hexFromWeights", () => {
  it("deve devolver as âncoras", () => {
    expect(hexFromWeights(0, { pure: 1, white: 0, black: 0 })).toBe("#ff0000");
    expect(hexFromWeights(120, { pure: 1, white: 0, black: 0 })).toBe("#00ff00");
    expect(hexFromWeights(0, { pure: 0, white: 1, black: 0 })).toBe("#ffffff");
    expect(hexFromWeights(0, { pure: 0, white: 0, black: 1 })).toBe("#000000");
  });

  it("deve misturar os três vértices no centro do triângulo", () => {
    const third = 1 / 3;
    expect(
      hexFromWeights(0, { pure: third, white: third, black: third }),
    ).toBe("#aa5555");
  });

  it("deve fazer round-trip com weightsFromHex", () => {
    for (const hex of ["#336699", "#ff8800", "#bababa", "#df7fa3"]) {
      const hue = hexToHsl(hex).h;
      const weights = weightsFromHex(hex);
      expect(hexFromWeights(hue, weights)).toBe(hex);
    }
  });
});

describe("barycentricWeights", () => {
  it("deve dar um terço para cada vértice no centro", () => {
    const weights = barycentricWeights({ x: 128, y: 128 });
    expect(weights).not.toBeNull();
    expect(weights?.pure).toBeCloseTo(1 / 3, 6);
    expect(weights?.white).toBeCloseTo(1 / 3, 6);
    expect(weights?.black).toBeCloseTo(1 / 3, 6);
  });

  it("deve devolver null fora do triângulo", () => {
    expect(barycentricWeights({ x: 128, y: 10 })).toBeNull();
    expect(barycentricWeights({ x: 10, y: 250 })).toBeNull();
  });
});

describe("pointFromWeights", () => {
  it("deve devolver os próprios vértices", () => {
    const apex = pointFromWeights(
      { pure: 1, white: 0, black: 0 },
      UPWARD_TRIANGLE,
    );
    expect(apex.x).toBeCloseTo(UPWARD_TRIANGLE.pure.x, 6);
    expect(apex.y).toBeCloseTo(UPWARD_TRIANGLE.pure.y, 6);
  });

  it("deve fazer round-trip ponto -> pesos -> ponto", () => {
    const point = { x: 140, y: 100 };
    const weights = barycentricWeights(point);
    expect(weights).not.toBeNull();
    const back = pointFromWeights(weights!, UPWARD_TRIANGLE);
    expect(back.x).toBeCloseTo(point.x, 6);
    expect(back.y).toBeCloseTo(point.y, 6);
  });
});

describe("buildTriangleMask", () => {
  it("deve marcar apenas pixels dentro do triângulo", () => {
    const mask = buildTriangleMask(64);
    expect(mask.pure[0]).toBe(-1);
    expect(mask.white[0]).toBe(0);
  });

  it("deve dar pesos altos para a cor pura perto da ponta", () => {
    const mask = buildTriangleMask(256);
    const scale = 1;
    const x = Math.round(WHEEL_CENTER * scale);
    const y = Math.round((UPWARD_TRIANGLE.pure.y + 3) * scale);
    const weights = mask.pure[y * 256 + x];
    expect(weights).toBeGreaterThan(0.9);
  });
});

describe("paintTriangle", () => {
  it("deve pintar os pesos como cores e deixar o fora do triângulo transparente", () => {
    const mask: TriangleMask = {
      resolution: 2,
      // pixels: [cor pura, branco, fora, preto]
      pure: new Float32Array([1, 0, -1, 0]),
      white: new Float32Array([0, 1, 0, 0]),
    };
    let painted: ImageData | null = null;
    const context = {
      createImageData: (width: number, height: number) =>
        ({
          data: new Uint8ClampedArray(width * height * 4),
          width,
          height,
        }) as ImageData,
      putImageData: (image: ImageData) => {
        painted = image;
      },
    } as unknown as CanvasRenderingContext2D;

    paintTriangle(context, 120, mask);

    const data = painted!.data;
    expect(Array.from(data.slice(0, 4))).toEqual([0, 255, 0, 255]);
    expect(Array.from(data.slice(4, 8))).toEqual([255, 255, 255, 255]);
    expect(Array.from(data.slice(8, 12))).toEqual([0, 0, 0, 0]);
    expect(Array.from(data.slice(12, 16))).toEqual([0, 0, 0, 255]);
  });
});
