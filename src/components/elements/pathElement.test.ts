/**
 * @vitest-environment jsdom
 */
import type { IPathElementData, Position, Size } from "src/components/types";
import { BoundingBox } from "src/utils/boundingBox";
import { PathElement } from "./pathElement";

describe("PathElement", () => {
  const position: Position = { x: 100, y: 200 };
  const initialSize: Size = { width: 300, height: 150 };
  const zIndex = 5;
  let element: PathElement;

  beforeEach(() => {
    element = new PathElement(position, initialSize, zIndex);
  });

  describe("basic properties", () => {
    it("should initialize with type 'path'", () => {
      const data = element.serialize();
      expect(data.type).toBe("path");
    });

    it("should have default points as empty array and allow setting them", () => {
      expect(element.points).toEqual([]);

      element.points = [{ x: 0, y: -50 }, { x: 100, y: 50 }];
      expect(element.points).toEqual([{ x: 0, y: -50 }, { x: 100, y: 50 }]);
      expect(element.serialize().points).toEqual([
        { x: 0, y: -50 },
        { x: 100, y: 50 },
      ]);
    });

    it("should have default isClosed = false and allow toggling", () => {
      expect(element.isClosed).toBe(false);

      element.isClosed = true;
      expect(element.isClosed).toBe(true);
      expect(element.serialize().isClosed).toBe(true);
    });

    it("should have default fillColor '#E0E0E0' and allow changing", () => {
      expect(element.fillColor).toBe("#E0E0E0");

      element.fillColor = "#ff0000";
      expect(element.fillColor).toBe("#ff0000");
    });

    it("should have default hasFill = false and allow toggling", () => {
      expect(element.hasFill).toBe(false);

      element.hasFill = true;
      expect(element.hasFill).toBe(true);
    });

    it("should have default strokeColor '#202020' and allow changing", () => {
      expect(element.strokeColor).toBe("#202020");

      element.strokeColor = "#00ff00";
      expect(element.strokeColor).toBe("#00ff00");
    });

    it("should have default hasStroke = true and allow toggling", () => {
      expect(element.hasStroke).toBe(true);

      element.hasStroke = false;
      expect(element.hasStroke).toBe(false);
    });

    it("should have default strokeWidth 3 and allow changing", () => {
      expect(element.strokeWidth).toBe(3);

      element.strokeWidth = 10;
      expect(element.strokeWidth).toBe(10);
    });
  });

  describe("serialize/deserialize", () => {
    it("should serialize to IPathElementData with all fields", () => {
      const data: IPathElementData = element.serialize();
      
      expect(data.type).toBe("path");
      expect(data.position).toEqual({ x: 100, y: 200 });
      expect(data.size).toEqual({ width: 300, height: 150 });
      expect(data.zDepth).toBe(5);
      
      expect(data.points.length).toBe(0);
      expect(data.isClosed).toBe(false);
      expect(data.fillColor).toBe("#E0E0E0");
      expect(data.hasFill).toBe(false);
      expect(data.strokeColor).toBe("#202020");
      expect(data.hasStroke).toBe(true);
      expect(data.strokeWidth).toBe(3);
    });

    it("should deserialize and restore all properties", () => {
      const data: IPathElementData = {
        type: "path",
        position: { x: 200, y: 400 },
        size: { width: 600, height: 300 },
        zDepth: 10,
        points: [{ x: 50, y: -75 }, { x: 100, y: 25 }],
        isClosed: true,
        fillColor: "#ffaa00",
        hasFill: true,
        strokeColor: "#0088cc",
        hasStroke: false,
        strokeWidth: 7,
      };

      element.deserialize(data);

      expect(element.position).toEqual({ x: 200, y: 400 });
      expect(element.size.width).toBe(600);
      expect(element.size.height).toBe(300);
      expect(element.zDepth).toBe(10);
      
      expect(element.points.length).toBe(2);
      expect(element.points[0]).toEqual({ x: 50, y: -75 });
      expect(element.points[1]).toEqual({ x: 100, y: 25 });
      expect(element.isClosed).toBe(true);
      
      expect(element.fillColor).toBe("#ffaa00");
      expect(element.hasFill).toBe(true);
      expect(element.strokeColor).toBe("#0088cc");
      expect(element.hasStroke).toBe(false);
      expect(element.strokeWidth).toBe(7);
    });

    it("should remain a PathElement after serialize/deserialize cycle", () => {
      const data = element.serialize();
      
      // Create new instance and deserialize
      const newData: IPathElementData = { ...data, type: "path" };
      const cloned = new PathElement(position, initialSize, zIndex);
      cloned.deserialize(newData);

      expect(cloned.constructor.name).toBe("PathElement");
    });
  });

  describe("getBoundingBox", () => {
    it("should return an updated BoundingBox instance", () => {
      const box1 = element.getBoundingBox();
      expect(box1).toBeInstanceOf(BoundingBox);

      // Change position and rotation
      element.position = { x: 300, y: 400 };
      element.rotation = 45;
      
      const box2 = element.getBoundingBox();
      expect(box2.center.x).toBe(300);
      expect(box2.center.y).toBe(400);
    });

    it("should calculate bounding box based on position and size", () => {
      // With rotation 0, should match initial values
      const box = element.getBoundingBox();
      
      expect(box.topLeft.x).toEqual(position.x - (initialSize.width / 2));
      expect(box.bottomRight.x).toEqual(position.x + (initialSize.width / 2));
      expect(box.topLeft.y).toEqual(position.y - (initialSize.height / 2));
      expect(box.bottomRight.y).toEqual(position.y + (initialSize.height / 2));
    });

    it("should update when rotation changes", () => {
      element.rotation = 90;
      const box = element.getBoundingBox();
      
      // After 90 degree rotation, dimensions swap in the bounding box
      expect(box.width).toBeCloseTo(initialSize.height);
      expect(box.height).toBeCloseTo(initialSize.width);
    });

    it("should update when scale changes", () => {
      element.scale = { x: 2, y: 1.5 };
      
      const box = element.getBoundingBox();
      // Bounding box should reflect scaled dimensions
      expect(box.topLeft.x).toBeLessThan(position.x - (initialSize.width / 2));
    });

    describe("should recalculate based on points", () => {
      it.each([0, 1, 5])("%d points should be handled", (pointCount) => {
        const relativePoints: Position[] = [];
        
        for (let i = 0; i < pointCount; i++) {
          // Create a triangle-like shape centered at origin
          const angle = (i / pointCount) * Math.PI * 2;
          const radius = 50;
          
          if (pointCount === 1) {
            relativePoints.push({ x: 30, y: -40 });
          } else if (pointCount >= 2 && i < pointCount - 1) {
            // Add points around the center for triangulation tests
            const dx = Math.cos(angle) * radius;
            const dy = Math.sin(angle) * radius;
            
            relativePoints.push({ x: dx, y: dy });
          } else if (pointCount >= 3) {
            // Close triangle with final point back at start for closed polygon tests
            relativePoints.push(relativePoints[0]);
          }
        }

        element.points = relativePoints;
        
        const box = element.getBoundingBox();
        
        // Bounding box should expand based on points added
        expect(box.width).toBeGreaterThan(30);
        expect(box.height).toBeGreaterThan(40);
      });
    });
  });
});
