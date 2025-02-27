import { BoundingBox } from "./boundingBox";

describe("BoundingBox", () => {
  const position = { x: 100, y: 100 };
  const size = { width: 50, height: 50 };

  it("should create a bounding box using Position and Size", () => {
    const box = new BoundingBox(position, size);
    expect(box.center).toEqual(position);
    expect(box.topLeft).toEqual({ x: 75, y: 75 });
    expect(box.topRight).toEqual({ x: 125, y: 75 });
    expect(box.bottomLeft).toEqual({ x: 75, y: 125 });
    expect(box.bottomRight).toEqual({ x: 125, y: 125 });
    expect(box.rotation).toEqual(0);
  });
});
