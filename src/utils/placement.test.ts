import { placeNearAnchor } from "./placement";
import type { Rect } from "./placement";

const rect = (
  left: number,
  top: number,
  width = 100,
  height = 20,
): Rect => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
});

const VIEWPORT = { width: 1200, height: 800 };
const SIZE = { width: 280, height: 320 };

describe("placeNearAnchor", () => {
  it("deve abrir abaixo e alinhado à esquerda quando há espaço", () => {
    expect(placeNearAnchor(rect(100, 100), SIZE, VIEWPORT)).toEqual({
      left: 100,
      top: 128,
    });
  });

  it("deve abrir acima quando não couber abaixo", () => {
    expect(placeNearAnchor(rect(100, 700), SIZE, VIEWPORT)).toEqual({
      left: 100,
      top: 372,
    });
  });

  it("deve alinhar pela direita da âncora quando estourar a direita", () => {
    expect(placeNearAnchor(rect(1100, 100), SIZE, VIEWPORT)).toEqual({
      left: 912,
      top: 128,
    });
  });

  it("deve prender à viewport quando a âncora está na borda", () => {
    expect(placeNearAnchor(rect(0, 0), SIZE, VIEWPORT)).toEqual({
      left: 8,
      top: 28,
    });
    expect(placeNearAnchor(rect(1180, 790), SIZE, VIEWPORT)).toEqual({
      left: 912,
      top: 462,
    });
  });

  it("deve ficar na margem quando o painel é maior que a viewport", () => {
    expect(
      placeNearAnchor(rect(100, 100), { width: 2000, height: 2000 }, VIEWPORT),
    ).toEqual({ left: 8, top: 8 });
  });
});
