import { EventBus } from "src/utils/eventBus";
import type { Element } from "./elements/element";
import { TextElement } from "./elements/textElement";
import { TransformBox } from "./transformBox";
import type { TElementData } from "./types";

/**
 * @jest-environment jsdom
 */
describe("TransformBox", () => {
  let canvas: HTMLCanvasElement;
  let elements: Element<TElementData>[];
  let bus: EventBus;
  let text: TextElement;

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
  });

  it("should create the transformBox containing the elements", () => {
    const transformBox = new TransformBox(elements, bus);
    expect(transformBox.position).toEqual({ x: 200, y: 200 });
    expect(transformBox.size.height).toBeCloseTo(97, 0);
    expect(transformBox.size.width).toBeCloseTo(185, 0);
  });

  it("should not create the transformBox if no selected elements are present", () => {
    const transformBox = new TransformBox([], bus);
    expect(transformBox.boundingBox).toEqual(null);
    expect(transformBox.handles).toEqual(null);
  });

  it("should update the position when calling updatePosition", () => {
    const transformBox = new TransformBox(elements, bus);
    const newPosition = { x: 150, y: 150 };
    transformBox.updatePosition(newPosition);

    expect(transformBox.position).toEqual(newPosition);
    expect(transformBox.boundingBox?.center).toEqual(newPosition)
  });

  xit("should update the scale when calling updateScale", () => {
    const transformBox = new TransformBox(elements, bus);
    const newScale = { x: 4, y: 4 };
    const newSize = { width: 742, height: 387 };

    transformBox.updateScale(newScale);

    expect(transformBox.size.height).toBeCloseTo(newSize.height, 0);
    expect(transformBox.size.width).toBeCloseTo(newSize.width, 0);
  });

  it("should update the rotation when calling updateRotation", () => {
    const transformBox = new TransformBox(elements, bus);
    const initialRotation = transformBox.rotation;
    const newRotation = 45;

    transformBox.updateRotation(newRotation);

    expect(transformBox.rotation).toEqual(newRotation);
    expect(transformBox.rotation).not.toEqual(initialRotation);
  });

  it("should calculate handles based on bounding box", () => {
    const transformBox = new TransformBox(elements, bus);
    expect(transformBox.handles).toBeDefined();
  });

  it("should contain the element in the selectedElements array", () => {
    const transformBox = new TransformBox(elements, bus);
    const element = elements[0];

    expect(transformBox.contains(element)).toBe(true);
  });

  it("should not contain an element that is not in the selectedElements array", () => {
    const transformBox = new TransformBox(elements, bus);
    const newElement = new TextElement(
      { x: 200, y: 200 },
      { width: 50, height: 50 },
      1,
    );

    expect(transformBox.contains(newElement as Element<TElementData>)).toBe(
      false,
    );
  });
});
