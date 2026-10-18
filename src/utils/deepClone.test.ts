import { deepClone } from "./deepClone";

class CustomThing {
  public readonly label = "custom";
}

describe("deepClone", () => {
  describe("primitives", () => {
    it("should return primitive values as they are", () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone("path")).toBe("path");
      expect(deepClone(true)).toBe(true);
      expect(deepClone(undefined)).toBeUndefined();
      expect(deepClone(null)).toBeNull();
    });
  });

  describe("plain objects and arrays", () => {
    it("should clone arrays so mutations do not leak in either direction", () => {
      const source = [1, 2, 3];
      const clone = deepClone(source);

      expect(Array.isArray(clone)).toBe(true);
      expect(clone).toEqual([1, 2, 3]);
      expect(clone).not.toBe(source);

      clone.push(4);
      expect(source).toEqual([1, 2, 3]);

      source.push(5);
      expect(clone).toEqual([1, 2, 3, 4]);
    });

    it("should deep clone plain objects and their nested values", () => {
      const source = { position: { x: 10, y: 20 }, name: "layer" };
      const clone = deepClone(source);

      expect(clone).toEqual(source);
      expect(clone).not.toBe(source);
      expect(clone.position).not.toBe(source.position);

      clone.position.x = 999;
      expect(source.position.x).toBe(10);

      source.position.y = 888;
      expect(clone.position.y).toBe(20);
    });

    it("should clone nested arrays and objects at every level", () => {
      const source = {
        points: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
      };
      const clone = deepClone(source);

      expect(clone.points).not.toBe(source.points);
      expect(clone.points[0]).not.toBe(source.points[0]);

      clone.points[0].x = 100;
      clone.points.push({ x: 5, y: 6 });
      expect(source.points).toEqual([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]);

      source.points[1].y = 400;
      expect(clone.points[1].y).toBe(4);
    });

    it("should deep clone objects created with a null prototype", () => {
      const source: Record<string, number> = Object.create(null);
      source.a = 1;
      const clone = deepClone(source);

      expect(clone).not.toBe(source);
      expect(Object.entries(clone)).toEqual([["a", 1]]);

      clone.a = 2;
      expect(source.a).toBe(1);

      source["b"] = 3;
      expect(Object.entries(clone)).toEqual([["a", 2]]);
    });
  });

  describe("undefined and null values", () => {
    it("should preserve undefined and null as keys and as values", () => {
      const source: { a: undefined; b: null; c: { d: undefined } } = {
        a: undefined,
        b: null,
        c: { d: undefined },
      };
      const clone = deepClone(source);

      // JSON round-trip would drop the "a" key entirely.
      expect(Object.keys(clone)).toEqual(["a", "b", "c"]);
      expect(Object.prototype.hasOwnProperty.call(clone, "a")).toBe(true);
      expect(clone.a).toBeUndefined();
      expect(clone.b).toBeNull();
      expect(Object.prototype.hasOwnProperty.call(clone.c, "d")).toBe(true);
      expect(clone.c.d).toBeUndefined();

      const sourceArray: Array<number | undefined | null> = [1, undefined, null];
      const cloneArray = deepClone(sourceArray);

      expect(cloneArray).toHaveLength(3);
      expect(cloneArray).not.toBe(sourceArray);
      expect(cloneArray[1]).toBeUndefined();
      expect(cloneArray[2]).toBeNull();
    });
  });

  describe("non-plain objects", () => {
    it("should return non-plain objects by reference", () => {
      const date = new Date("2024-01-01T00:00:00.000Z");
      const map = new Map<string, number>([["a", 1]]);
      const set = new Set<number>([1]);
      const instance = new CustomThing();

      expect(deepClone(date)).toBe(date);
      expect(deepClone(map)).toBe(map);
      expect(deepClone(set)).toBe(set);
      expect(deepClone(instance)).toBe(instance);
    });

    it("should keep nested non-plain values by reference while cloning their container", () => {
      const image = new Image();
      const source = { image, position: { x: 1, y: 1 } };
      const clone = deepClone(source);

      expect(clone).not.toBe(source);
      expect(clone.image).toBe(image);
      expect(clone.position).not.toBe(source.position);

      clone.position.x = 42;
      expect(source.position.x).toBe(1);
    });
  });

  describe("copied element data (regression)", () => {
    it("should isolate a serialized snapshot from the live state in both directions", () => {
      const liveData = {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        filters: [{ brightness: 100 }],
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
        children: [{ position: { x: 2, y: 2 } }],
      };

      const firstPaste = deepClone(liveData);
      const secondPaste = deepClone(liveData);

      firstPaste.scale.x = 2;
      firstPaste.points[0].x = 5;
      firstPaste.filters[0].brightness = 50;
      firstPaste.children[0].position.x = 9;

      expect(liveData.scale.x).toBe(1);
      expect(liveData.points[0].x).toBe(0);
      expect(liveData.filters[0].brightness).toBe(100);
      expect(liveData.children[0].position.x).toBe(2);

      expect(secondPaste.scale.x).toBe(1);
      expect(secondPaste.points[0].x).toBe(0);
      expect(secondPaste.filters[0].brightness).toBe(100);
      expect(secondPaste.children[0].position.x).toBe(2);

      liveData.position.x = 77;
      expect(firstPaste.position.x).toBe(0);
      expect(secondPaste.position.x).toBe(0);
    });
  });
});
