import { EventBus } from "src/utils/eventBus";
import type { Element } from "./elements/element";
import { TextElement } from "./elements/textElement";
import { TransformBox } from "./transformBox";
import type { TElementData } from "./types";

describe("TransformBox", () => {
  let canvas: HTMLCanvasElement;
  let elements: Element<TElementData>[];
  let bus: EventBus;
  let text: TextElement;
  let transformBox: TransformBox;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    bus = new EventBus();
    text = new TextElement(
      { x: canvas.width / 2, y: canvas.height / 2 },
      { width: 185.47, height: 96.8 },
      0,
    );
    text.content = ["TEXT"];
    text.font = "Arial";
    elements = [text as Element<TElementData>];

    jest.spyOn(bus, "on");
    jest.spyOn(bus, "off");
    jest.spyOn(bus, "emit");
    jest.spyOn(bus, "request").mockImplementation((event: string) => {
      if (event === "zoomLevel:get") return [1];
      if (event === "workarea:offset:get") return [{ x: 0, y: 0 }];
      if (event === "transformBox:anchorPoint:get")
        return [transformBox.anchorPoint];
      if (event === "transformBox:position") return [transformBox.position];
      if (event === "transformBox:rotation") return [transformBox.rotation];
      if (event === "transformBox:properties:get") {
        return [
          {
            position: transformBox.position,
            size: transformBox.size,
            opacity: transformBox.opacity,
            rotation: transformBox.rotation,
          },
        ];
      }
      if (event === "transformBox:getSignAndAnchor") {
        return [transformBox.calculateSignAndAnchor()];
      }
      return [];
    });

    transformBox = new TransformBox(elements, bus);
  });

  it("should create the transformBox containing the elements", () => {
    expect(transformBox.position).toEqual({ x: 200, y: 200 });
    expect(transformBox.size.height).toBeCloseTo(97, 0);
    expect(transformBox.size.width).toBeCloseTo(185, 0);
  });

  it("should not create the transformBox if no selected elements are present", () => {
    const emptyTransformBox = new TransformBox([], bus);
    expect(emptyTransformBox.boundingBox).toEqual(null);
    expect(emptyTransformBox.handles).toEqual(null);
  });

  it("should add events on construction", () => {
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:updateOpacity",
      expect.any(Function),
    );
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:updatePosition",
      expect.any(Function),
    );
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:updateRotation",
      expect.any(Function),
    );
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:updateScale",
      expect.any(Function),
    );
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:anchorPoint:change",
      expect.any(Function),
    );
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:anchorPoint:get",
      expect.any(Function),
    );
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:properties:get",
      expect.any(Function),
    );
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:position",
      expect.any(Function),
    );
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:rotation",
      expect.any(Function),
    );
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:hoverHandle",
      expect.any(Function),
    );
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:selectHandle",
      expect.any(Function),
    );
    expect(bus.on).toHaveBeenCalledWith(
      "transformBox:getSignAndAnchor",
      expect.any(Function),
    );
  });

  it("should remove events", () => {
    transformBox.removeEvents();
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:updateOpacity",
      expect.any(Function),
    );
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:updatePosition",
      expect.any(Function),
    );
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:updateRotation",
      expect.any(Function),
    );
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:updateScale",
      expect.any(Function),
    );
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:anchorPoint:change",
      expect.any(Function),
    );
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:anchorPoint:get",
      expect.any(Function),
    );
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:properties:get",
      expect.any(Function),
    );
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:position",
      expect.any(Function),
    );
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:rotation",
      expect.any(Function),
    );
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:hoverHandle",
      expect.any(Function),
    );
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:selectHandle",
      expect.any(Function),
    );
    expect(bus.off).toHaveBeenCalledWith(
      "transformBox:getSignAndAnchor",
      expect.any(Function),
    );
  });

  it("should update the opacity when calling updateOpacity", () => {
    const newOpacity = 0.5;
    transformBox.updateOpacity({ delta: newOpacity });

    expect(transformBox.opacity).toEqual(newOpacity);
    expect(text.opacity).toEqual(newOpacity);
    expect(bus.emit).toHaveBeenCalledWith("transformBox:properties:change", {
      position: transformBox.position,
      size: transformBox.size,
      rotation: transformBox.rotation,
      opacity: newOpacity,
    });
  });

  it("should update the position when calling updatePosition", () => {
    const newPosition = { x: 150, y: 150 };
    transformBox.updatePosition({ position: newPosition });

    expect(transformBox.position).toEqual(newPosition);
    expect(transformBox.boundingBox?.center).toEqual(newPosition);
    expect(text.position).toEqual(newPosition);
    expect(bus.emit).toHaveBeenCalledWith("transformBox:properties:change", {
      position: newPosition,
      size: transformBox.size,
      rotation: transformBox.rotation,
      opacity: transformBox.opacity,
    });
  });

  it("should update the rotation when calling updateRotation", () => {
    const newRotation = 45;
    transformBox.updateRotation({ delta: newRotation });

    expect(transformBox.rotation).toEqual(newRotation);
    expect(text.rotation).toEqual(newRotation);
    expect(bus.emit).toHaveBeenCalledWith("transformBox:properties:change", {
      position: transformBox.position,
      size: transformBox.size,
      rotation: newRotation,
      opacity: transformBox.opacity,
    });
  });

  it("should update the scale when calling updateScale", () => {
    const newScale = { x: 2, y: 2 };
    const initialSize = { ...transformBox.size };

    transformBox.updateScale({ delta: newScale });

    expect(transformBox.size.width).toBeCloseTo(initialSize.width * newScale.x);
    expect(transformBox.size.height).toBeCloseTo(
      initialSize.height * newScale.y,
    );
    expect(text.scale.x).toBeCloseTo(newScale.x);
    expect(text.scale.y).toBeCloseTo(newScale.y);
    expect(bus.emit).toHaveBeenCalledWith("transformBox:properties:change", {
      position: transformBox.position,
      size: transformBox.size,
      rotation: transformBox.rotation,
      opacity: transformBox.opacity,
    });
  });

  it("should calculate handles based on bounding box", () => {
    expect(transformBox.handles).toBeDefined();
    expect(Object.keys(transformBox.handles!).length).toBe(9);
  });

  it("should contain the element in the selectedElements array", () => {
    const element = elements[0];
    expect(transformBox.contains(element)).toBe(true);
  });

  it("should not contain an element that is not in the selectedElements array", () => {
    const newElement = new TextElement(
      { x: 200, y: 200 },
      { width: 50, height: 50 },
      1,
    );
    expect(transformBox.contains(newElement as Element<TElementData>)).toBe(
      false,
    );
  });

  it("should set hoveredHandle on hoverHandle", () => {
    const handlePosition = transformBox.handles!.TOP_LEFT;
    transformBox.hoverHandle({ position: handlePosition });
    expect(transformBox.hoveredHandle).toEqual("TOP_LEFT");
  });

  it("should set selectedHandle on selectHandle", () => {
    const handlePosition = transformBox.handles!.TOP_LEFT;
    transformBox.hoverHandle({ position: handlePosition });
    const result = transformBox.selectHandle();
    expect(result).toBe(true);
    expect(transformBox.selectedHandle).toEqual("TOP_LEFT");
  });

  describe("calculateSignAndAnchor", () => {
    it("should return correct sign and anchor for TOP_LEFT", () => {
      transformBox.selectedHandle = "TOP_LEFT";
      const { anchor, xSign, ySign } = transformBox.calculateSignAndAnchor();
      expect(xSign).toBe(-1);
      expect(ySign).toBe(-1);
      expect(anchor).toEqual(transformBox.handles!.BOTTOM_RIGHT);
    });

    it("should return correct sign and anchor for TOP", () => {
      transformBox.selectedHandle = "TOP";
      const { anchor, xSign, ySign } = transformBox.calculateSignAndAnchor();
      expect(xSign).toBe(0);
      expect(ySign).toBe(-1);
      expect(anchor).toEqual(transformBox.handles!.BOTTOM);
    });

    // Add more cases for other handles as needed
  });

  it("should draw the bounding box and handles", () => {
    const context = canvas.getContext("2d")!;
    const saveSpy = jest.spyOn(context, "save");
    const restoreSpy = jest.spyOn(context, "restore");
    const strokeRectSpy = jest.spyOn(context, "stroke");
    const fillSpy = jest.spyOn(context, "fill");

    transformBox.draw(context);

    expect(saveSpy).toHaveBeenCalled();
    expect(strokeRectSpy).toHaveBeenCalled();
    expect(fillSpy).toHaveBeenCalled(); // For handles
    expect(restoreSpy).toHaveBeenCalled();
  });
});
