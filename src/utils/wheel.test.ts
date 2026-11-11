import {
  RING_RADIUS,
  WHEEL_CENTER,
  hueToPoint,
  normalizeHue,
  pointToHue,
  rotatePoint,
} from "./wheel";

describe("normalizeHue", () => {
  it("deve manter hues dentro do intervalo", () => {
    expect(normalizeHue(0)).toBe(0);
    expect(normalizeHue(210)).toBe(210);
  });

  it("deve dar a volta em valores fora do intervalo", () => {
    expect(normalizeHue(360)).toBe(0);
    expect(normalizeHue(-30)).toBe(330);
    expect(normalizeHue(725)).toBe(5);
  });
});

describe("pointToHue", () => {
  it("deve mapear topo, direita, baixo e esquerda", () => {
    expect(pointToHue({ x: WHEEL_CENTER, y: WHEEL_CENTER - RING_RADIUS })).toBeCloseTo(0, 6);
    expect(pointToHue({ x: WHEEL_CENTER + RING_RADIUS, y: WHEEL_CENTER })).toBeCloseTo(90, 6);
    expect(pointToHue({ x: WHEEL_CENTER, y: WHEEL_CENTER + RING_RADIUS })).toBeCloseTo(180, 6);
    expect(pointToHue({ x: WHEEL_CENTER - RING_RADIUS, y: WHEEL_CENTER })).toBeCloseTo(270, 6);
  });

  it("deve ignorar a distância até o centro", () => {
    expect(pointToHue({ x: 128, y: 10 })).toBeCloseTo(0, 6);
    expect(pointToHue({ x: 250, y: 128 })).toBeCloseTo(90, 6);
  });
});

describe("hueToPoint", () => {
  const expectClose = (actual: { x: number; y: number }, expected: { x: number; y: number }) => {
    expect(actual.x).toBeCloseTo(expected.x, 6);
    expect(actual.y).toBeCloseTo(expected.y, 6);
  };

  it("deve posicionar o hue nos quatro pontos cardeais", () => {
    expectClose(hueToPoint(0), { x: 128, y: 16 });
    expectClose(hueToPoint(90), { x: 240, y: 128 });
    expectClose(hueToPoint(180), { x: 128, y: 240 });
    expectClose(hueToPoint(270), { x: 16, y: 128 });
  });

  it("deve respeitar o raio informado", () => {
    expectClose(hueToPoint(90, 88), { x: 216, y: 128 });
  });
});

describe("pointToHue <-> hueToPoint", () => {
  it("deve fazer round-trip", () => {
    for (const hue of [0, 37, 90, 180, 270, 359]) {
      const point = hueToPoint(hue);
      expect(pointToHue(point)).toBeCloseTo(hue, 6);
    }
  });
});

describe("rotatePoint", () => {
  it("deve girar no sentido horário", () => {
    const rotated = rotatePoint({ x: 128, y: 40 }, 90);
    expect(rotated.x).toBeCloseTo(216, 6);
    expect(rotated.y).toBeCloseTo(128, 6);
  });

  it("deve ser o inverso de si mesmo com ângulo oposto", () => {
    const point = { x: 200, y: 80 };
    const back = rotatePoint(rotatePoint(point, 123), -123);
    expect(back.x).toBeCloseTo(point.x, 6);
    expect(back.y).toBeCloseTo(point.y, 6);
  });
});
