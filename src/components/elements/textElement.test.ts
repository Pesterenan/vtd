import type { ITextElementData, Position, Size } from "src/components/types";
import { BoundingBox } from "src/utils/boundingBox";
import { TextElement } from "./textElement";

/**
 * @jest-environment jsdom
 */
describe("TextElement", () => {
  const position: Position = { x: 100, y: 200 };
  const initialSize: Size = { width: 300, height: 150 };
  const zIndex = 5;

  let element: TextElement;

  beforeEach(() => {
    element = new TextElement(position, initialSize, zIndex);
  });

  describe("basic properties", () => {
    it("should initialize with type 'text'", () => {
      const data = element.serialize();
      expect(data.type).toBe("text");
    });

    it("should have default font and allow changing it", () => {
      expect(element.font).toBe("Impact");

      element.font = "Arial";
      expect(element.font).toBe("Arial");
      expect(element.serialize().font).toContain("Arial");
    });

    it("should have default fillColor and strokeColor and allow changing them", () => {
      expect(element.fillColor).toMatch(/^#/);
      expect(element.strokeColor).toMatch(/^#/);

      element.fillColor = "#ff0000";
      element.strokeColor = "#00ff00";

      expect(element.fillColor).toBe("#ff0000");
      expect(element.strokeColor).toBe("#00ff00");
    });

    it("should have boolean hasFill and hasStroke and allow toggling", () => {
      expect(element.hasFill).toBe(true);
      expect(element.hasStroke).toBe(false);

      element.hasFill = false;
      element.hasStroke = true;

      expect(element.hasFill).toBe(false);
      expect(element.hasStroke).toBe(true);
    });
  });

  describe("font size and line spacing", () => {
    it("should start with fontSize > 1 and lineHeight > 0.1", () => {
      expect(element.fontSize).toBeGreaterThan(1);
      expect(element.lineHeight).toBeGreaterThan(0.1);
    });

    it("should update lineVerticalSpacing when fontSize is set", () => {
      element.lineHeight = 2;
      element.fontSize = 20;
      expect(element.lineVerticalSpacing).toBeCloseTo(20 * 2);
    });

    it("should update lineVerticalSpacing when lineHeight is set", () => {
      element.fontSize = 10;
      element.lineHeight = 1.5;
      expect(element.lineVerticalSpacing).toBeCloseTo(10 * 1.5);
    });

    it("should ignore invalid fontSize <= 1 and lineHeight <= 0.1", () => {
      const originalSize = element.fontSize;
      element.fontSize = 1;
      expect(element.fontSize).toBe(originalSize);

      const originalLH = element.lineHeight;
      element.lineHeight = 0.1;
      expect(element.lineHeight).toBe(originalLH);
    });
  });

  describe("text content", () => {
    it("should start with a single default line of text", () => {
      expect(element.content).toEqual(["Sample Text"]);
    });

    it("should split and join content by newline when set", () => {
      element.content = ["line1", "line2", "line3"];
      expect(element.content).toEqual(["line1", "line2", "line3"]);

      const data = element.serialize();
      expect(data.content).toBe("line1\nline2\nline3");
    });
  });

  describe("bounding box", () => {
    it("getBoundingBox should return an updated BoundingBox", () => {
      const box1 = element.getBoundingBox();
      expect(box1).toBeInstanceOf(BoundingBox);

      element.position = { x: 300, y: 400 };
      const box2 = element.getBoundingBox();
      expect(box2.center).toEqual({ x: 300, y: 400 });
    });

    describe("should grow bounding box according to text alignment", () =>  {
      it("should grow to the right when editing left-aligned content", () => {
        let box = element.getBoundingBox();
        const initialTopLeftX = box.topLeft;
        element.content = ["Sample Text"];
        expect(box.topLeft.x).toBeCloseTo(initialTopLeftX.x);
        element.textAlign = "left";
        element.content = ["Sample", "Text"];
        box = element.getBoundingBox();
        expect(box.topLeft.x).toBeCloseTo(initialTopLeftX.x);
      });

      it("should grow to the left when editing right-aligned content", () => {
        let box = element.getBoundingBox();
        const initialTopRightX = box.topRight;
        element.content = ["Sample Text"];
        expect(box.topRight.x).toBeCloseTo(initialTopRightX.x);
        element.textAlign = "right";
        element.content = ["Sample", "Text"];
        box = element.getBoundingBox();
        expect(box.topRight.x).toBeCloseTo(initialTopRightX.x);
      });
    });

  });

  describe("text alignment", () => {
    it("should default to textAlign 'center'", () => {
      expect(element.textAlign).toBe("center");
    });

    it.each(["left", "center", "right"] as ITextElementData['textAlign'][]) (
      "should set textAlign to %s",
      (alignment) => {
        element.textAlign = alignment;
        expect(element.textAlign).toBe(alignment);
      }
    );
  });

  describe("font styles", () => {
    it("should default to fontWeight 'normal'", () => {
      expect(element.fontWeight).toBe("normal");
    });

    it.each(["normal", "bold", "italic", "bold italic"] as ITextElementData['fontWeight'][]) (
      "should set fontWeight to %s",
      (weight): void => {
        (element).fontWeight = weight;
        expect((element).fontWeight).toBe(weight);
      }
    );
  });
});
