import type { IGradientElementData } from "src/components/types";
import { GradientElement } from "./gradientElement";

const BASE_DATA: IGradientElementData = {
  type: "gradient",
  position: { x: 50, y: 50 },
  scale: { x: 1, y: 1 },
  size: { width: 100, height: 100 },
  rotation: 0,
  opacity: 1,
  zDepth: 0,
  isLocked: false,
  isVisible: true,
  layerName: "gradient",
  filters: [],
  startPosition: { x: 50, y: 0 },
  endPosition: { x: 50, y: 100 },
  colorStops: [
    { portion: 0, color: "#000000", alpha: 1 },
    { portion: 1, color: "#FFFFFF", alpha: 1 },
  ],
  gradientFormat: "linear",
};

function loadInKeyOrder(
  keys: Array<keyof IGradientElementData>,
): GradientElement {
  const element = new GradientElement(
    { x: 0, y: 0 },
    { width: 100, height: 100 },
    0,
  );
  const ordered: Record<string, unknown> = {};
  for (const key of keys) {
    ordered[key] = BASE_DATA[key];
  }
  element.deserialize(ordered as unknown as IGradientElementData);
  return element;
}

describe("GradientElement", () => {
  describe("deserialize key order", () => {
    it("loads the same visual state regardless of key order", () => {
      const forward = loadInKeyOrder(
        Object.keys(BASE_DATA) as Array<keyof IGradientElementData>,
      );
      const reversed = loadInKeyOrder(
        Object.keys(BASE_DATA).reverse() as Array<keyof IGradientElementData>,
      );

      for (const element of [forward, reversed]) {
        expect(element.position).toEqual(BASE_DATA.position);
        expect(element.rotation).toBe(BASE_DATA.rotation);
        expect(element.startPosition).toEqual(BASE_DATA.startPosition);
        expect(element.endPosition).toEqual(BASE_DATA.endPosition);
        expect(element.colorStops).toEqual(BASE_DATA.colorStops);
      }
      expect(reversed.startPosition).toEqual(forward.startPosition);
      expect(reversed.endPosition).toEqual(forward.endPosition);
    });
  });

  describe("rigid handle compensation", () => {
    it("shifts handles by the same delta when position changes", () => {
      const element = new GradientElement(
        { x: 0, y: 0 },
        { width: 100, height: 100 },
        0,
      );
      element.deserialize({ ...BASE_DATA });

      element.position = { x: 60, y: 70 };

      expect(element.startPosition).toEqual({ x: 60, y: 20 });
      expect(element.endPosition).toEqual({ x: 60, y: 120 });
    });

    it("rotates handles around position when rotation changes", () => {
      const element = new GradientElement(
        { x: 0, y: 0 },
        { width: 100, height: 100 },
        0,
      );
      element.deserialize({ ...BASE_DATA });

      element.rotation = 90;

      expect(element.startPosition.x).toBeCloseTo(100);
      expect(element.startPosition.y).toBeCloseTo(50);
      expect(element.endPosition.x).toBeCloseTo(0);
      expect(element.endPosition.y).toBeCloseTo(50);
    });
  });
});
