import { BoundingBox } from "src/utils/boundingBox";
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

  it("should not create the transformBox if no selected elements are present", () => {
    const transformBox = new TransformBox([], canvas);
    expect(transformBox.boundingBox).toEqual(null);
    expect(transformBox.handles).toEqual(null);
  });

  it("should update the position when calling updatePosition", () => {
    const transformBox = new TransformBox(elements, canvas);
    const newPosition = { x: 150, y: 150 };
    transformBox.updatePosition(newPosition);

    expect(transformBox.position).toEqual(newPosition);
    expect(transformBox.boundingBox).toEqual({
      center: { x: 150, y: 150 },
      bottomLeft: { x: newPosition.x - 25, y: newPosition.y + 25 },
      bottomRight: { x: newPosition.y + 25, y: newPosition.y + 25 },
      rotation: 0,
      topLeft: { x: newPosition.x - 25, y: newPosition.y - 25 },
      topRight: { x: newPosition.y + 25, y: newPosition.y - 25 },
    });
  });

  it("should update the scale when calling updateScale", () => {
    const transformBox = new TransformBox(elements, canvas);
    const newScale = { x: 4, y: 4 };
    const newSize = { width: 200, height: 200 };
    const origin = transformBox?.handles?.CENTER || { x: 0, y: 0 };

    transformBox.updateScale(newScale, origin);

    expect(transformBox.size).toEqual(newSize);
    expect(transformBox.boundingBox).toEqual(
      new BoundingBox({ x: 200, y: 200 }, newSize, 0),
    );
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

    const expectedHandles: TransformBox["handles"] = {
      TOP_LEFT: { x: 175, y: 175 },
      TOP: { x: 200, y: 175 },
      TOP_RIGHT: { x: 225, y: 175 },
      RIGHT: { x: 225, y: 200 },
      BOTTOM_RIGHT: { x: 225, y: 225 },
      BOTTOM: { x: 200, y: 225 },
      BOTTOM_LEFT: { x: 175, y: 225 },
      LEFT: { x: 175, y: 200 },
      CENTER: { x: 200, y: 200 },
    };

    expect(transformBox.handles).toEqual(expectedHandles);
  });

  it("should contain the element in the selectedElements array", () => {
    const transformBox = new TransformBox(elements, canvas);
    const element = elements[0];

    expect(transformBox.contains(element)).toBe(true);
  });

  it("should not contain an element that is not in the selectedElements array", () => {
    const transformBox = new TransformBox(elements, canvas);
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
