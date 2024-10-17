import type { Element } from "./elements/element";
import { TextElement } from "./elements/textElement";
import { TransformBox } from "./transformBox";
import type { TElementData } from "./types";

describe("TransformBox", () => {
  let canvas: HTMLCanvasElement;
  let elements: Element<TElementData>[];

  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    elements = [
      new TextElement(
        { x: canvas.width / 2, y: canvas.height / 2 },
        { width: 50, height: 50 },
        0,
      ) as Element<TElementData>,
    ];
  });

  it("should create the transformBox containing the elements", () => {
    const transformBox = new TransformBox(elements, canvas);
    expect(transformBox.position).toEqual({ x: 200, y: 200 });
    expect(transformBox.size).toEqual({ width: 50, height: 50 });
  });

  it("should update the position when calling updatePosition", () => {
    const transformBox = new TransformBox(elements, canvas);
    const newPosition = { x: 150, y: 150 };
    transformBox.updatePosition(newPosition);

    expect(transformBox.position).toEqual(newPosition);
    expect(transformBox.boundingBox).toEqual({
      x1: newPosition.x - 25,
      y1: newPosition.y - 25,
      x2: newPosition.x + 25,
      y2: newPosition.y + 25,
    });
  });

  it("should update the scale when calling updateScale", () => {
    const transformBox = new TransformBox(elements, canvas);
    const newSize = { width: 100, height: 100 };
    const origin = transformBox.position;

    transformBox.updateScale(newSize, origin);

    expect(transformBox.size).toEqual(newSize);
    expect(transformBox.boundingBox).toEqual({ x1: 150, y1: 150, x2: 250, y2: 250 });
  });

  it("should update the rotation when calling updateRotation", () => {
    const transformBox = new TransformBox(elements, canvas);
    const initialRotation = transformBox.rotation;
    const newRotation = 45;

    transformBox.updateRotation(newRotation);

    expect(transformBox.rotation).toEqual(newRotation);
    expect(transformBox.rotation).not.toEqual(initialRotation);
  });

  it("should calculate handles based on bounding box", () => {
    const transformBox = new TransformBox(elements, canvas);

    const expectedHandles = [
      { x: 175, y: 175 }, // Top-left
      { x: 200, y: 175 }, // Top-middle
      { x: 225, y: 175 }, // Top-right
      { x: 225, y: 200 }, // Right-middle
      { x: 225, y: 225 }, // Bottom-right
      { x: 200, y: 225 }, // Bottom-middle
      { x: 175, y: 225 }, // Bottom-left
      { x: 175, y: 200 }, // Left-middle
    ];

    expect(transformBox.handles).toEqual(expectedHandles);
  });

  it("should contain the element in the selectedElements array", () => {
    const transformBox = new TransformBox(elements, canvas);
    const element = elements[0];

    expect(transformBox.contains(element)).toBe(true);
  });

  it("should not contain an element that is not in the selectedElements array", () => {
    const transformBox = new TransformBox(elements, canvas);
    const newElement = new TextElement({ x: 200, y: 200 }, { width: 50, height: 50 }, 1);

    expect(transformBox.contains(newElement as Element<TElementData>)).toBe(false);
  });
});
