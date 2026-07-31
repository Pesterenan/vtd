/**
 * @vitest-environment jsdom
 */
import { PathElement } from "src/components/elements/pathElement";
import type { IPathElementData, Point, Position } from "src/components/types";
import { EventBus } from "src/utils/eventBus";
import { WorkArea } from "./workArea";

describe("WorkArea - Path Integration", () => {
  let eventBus: EventBus;
  let workArea: WorkArea;

  beforeEach(() => {
    eventBus = new EventBus();
    workArea = new WorkArea(eventBus);
    workArea.setWorkAreaSize({ width: 800, height: 600 });
    vi.spyOn(eventBus, "emit");
    vi.spyOn(eventBus, "request").mockImplementation((event, payload) => {
      if (event === "workarea:adjustForCanvas") {
        return [{ x: payload?.position?.x || 0, y: payload?.position?.y || 0 }];
      }
      return [];
    });
  });

  describe("handleEditPath", () => {
    it("should create a PathElement and add to elements on edit:path event", () => {
      const position: Position = { x: 400, y: 300 };
      const absolutePoints: Point[] = [
        { x: 350, y: 250 },
        { x: 450, y: 250 },
        { x: 450, y: 350 },
        { x: 350, y: 350 },
      ];
      const expectedRelative: Point[] = [
        { x: -50, y: -50 },
        { x: 50, y: -50 },
        { x: 50, y: 50 },
        { x: -50, y: 50 },
      ];

      eventBus.emit("edit:path", { position, points: absolutePoints, isClosed: true });

      expect(workArea.elements.length).toBe(1);
      const element = workArea.elements[0];
      expect(element).toBeInstanceOf(PathElement);
      const pathElement = element as PathElement;
      expect(pathElement.points).toEqual(expectedRelative);
      expect(pathElement.isClosed).toBe(true);
    });

    it("should emit workarea:addElement with type 'path'", () => {
      const position: Position = { x: 400, y: 300 };
      const points: Point[] = [
        { x: 350, y: 250 },
        { x: 450, y: 350 },
      ];

      eventBus.emit("edit:path", { position, points, isClosed: false });

      expect(eventBus.emit).toHaveBeenCalledWith(
        "workarea:addElement",
        expect.objectContaining({ type: "path" }),
      );
    });

    it("should emit workarea:update after path creation", () => {
      const position: Position = { x: 400, y: 300 };
      const points: Point[] = [{ x: 350, y: 250 }, { x: 450, y: 350 }];

      eventBus.emit("edit:path", { position, points, isClosed: false });

      expect(eventBus.emit).toHaveBeenCalledWith("workarea:update");
    });

    it("should select the path element after creation", () => {
      const position: Position = { x: 400, y: 300 };
      const points: Point[] = [{ x: 350, y: 250 }, { x: 450, y: 350 }];

      eventBus.emit("edit:path", { position, points, isClosed: false });

      expect(workArea.elements[0].selected).toBe(true);
    });

    it("should handle closed path correctly", () => {
      const position: Position = { x: 200, y: 150 };
      const points: Point[] = [
        { x: 170, y: 120 },
        { x: 230, y: 120 },
        { x: 200, y: 180 },
      ];

      eventBus.emit("edit:path", { position, points, isClosed: true });

      const pathElement = workArea.elements[0] as PathElement;
      expect(pathElement.isClosed).toBe(true);
    });

    it("should handle multiple path creations sequentially", () => {
      const path1Absolute: Point[] = [{ x: 90, y: 90 }, { x: 110, y: 110 }];
      const path1Expected: Point[] = [{ x: -10, y: -10 }, { x: 10, y: 10 }];
      const path2Absolute: Point[] = [{ x: 180, y: 180 }, { x: 220, y: 220 }];
      const path2Expected: Point[] = [{ x: -20, y: -20 }, { x: 20, y: 20 }];

      eventBus.emit("edit:path", {
        position: { x: 100, y: 100 },
        points: path1Absolute,
        isClosed: false,
      });
      eventBus.emit("edit:path", {
        position: { x: 200, y: 200 },
        points: path2Absolute,
        isClosed: true,
      });

      expect(workArea.elements.length).toBe(2);
      expect((workArea.elements[0] as PathElement).points).toEqual(path1Expected);
      expect((workArea.elements[1] as PathElement).points).toEqual(path2Expected);
      expect((workArea.elements[1] as PathElement).isClosed).toBe(true);
    });
  });

  describe("createElementFromData - path type", () => {
    it("should create PathElement from IPathElementData", async () => {
      const data: IPathElementData = {
        type: "path",
        position: { x: 100, y: 200 },
        size: { width: 100, height: 100 },
        zDepth: 0,
        points: [
          { x: -50, y: -50 },
          { x: 50, y: 50 },
        ],
        isClosed: false,
        hasFill: false,
        hasStroke: true,
        fillColor: "#E0E0E0",
        strokeColor: "#202020",
        strokeWidth: 3,
        rotation: 0,
        scale: { x: 1, y: 1 },
        opacity: 1,
        isLocked: false,
        isVisible: true,
        layerName: "Path",
        filters: [],
      };
      const element = await workArea.createElementFromData(data);
      expect(element).toBeInstanceOf(PathElement);
    });

    it("should deserialize all path properties on creation", async () => {
      const data: IPathElementData = {
        type: "path",
        position: { x: 200, y: 400 },
        size: { width: 60, height: 80 },
        zDepth: 5,
        points: [
          { x: -30, y: -40 },
          { x: 30, y: -40 },
          { x: 30, y: 40 },
          { x: -30, y: 40 },
        ],
        isClosed: true,
        hasFill: true,
        hasStroke: false,
        fillColor: "#ff0000",
        strokeColor: "#00ff00",
        strokeWidth: 5,
        rotation: 45,
        scale: { x: 1.5, y: 1.5 },
        opacity: 0.8,
        isLocked: false,
        isVisible: true,
        layerName: "Red Square",
        filters: [],
      };

      const element = await workArea.createElementFromData(data);
      const pathElement = element as PathElement;

      expect(pathElement.position).toEqual({ x: 200, y: 400 });
      expect(pathElement.points).toEqual(data.points);
      expect(pathElement.isClosed).toBe(true);
      expect(pathElement.hasFill).toBe(true);
      expect(pathElement.hasStroke).toBe(false);
      expect(pathElement.fillColor).toBe("#ff0000");
      expect(pathElement.strokeColor).toBe("#00ff00");
      expect(pathElement.strokeWidth).toBe(5);
      expect(pathElement.rotation).toBe(45);
      expect(pathElement.scale).toEqual({ x: 1.5, y: 1.5 });
    });
  });

  describe("loadElements - with path elements", () => {
    it("should load multiple path elements via loadElements", async () => {
      const pathData1: IPathElementData = {
        type: "path",
        position: { x: 100, y: 100 },
        size: { width: 50, height: 50 },
        zDepth: 0,
        points: [{ x: -25, y: -25 }, { x: 25, y: 25 }],
        isClosed: false,
        hasFill: false,
        hasStroke: true,
        fillColor: "#E0E0E0",
        strokeColor: "#202020",
        strokeWidth: 3,
        rotation: 0,
        scale: { x: 1, y: 1 },
        opacity: 1,
        isLocked: false,
        isVisible: true,
        layerName: "Path 1",
        filters: [],
      };
      const pathData2: IPathElementData = {
        type: "path",
        position: { x: 300, y: 300 },
        size: { width: 100, height: 100 },
        zDepth: 1,
        points: [{ x: -50, y: -50 }, { x: 50, y: 50 }],
        isClosed: true,
        hasFill: true,
        hasStroke: false,
        fillColor: "#00ff00",
        strokeColor: "#202020",
        strokeWidth: 3,
        rotation: 0,
        scale: { x: 1, y: 1 },
        opacity: 1,
        isLocked: false,
        isVisible: true,
        layerName: "Path 2",
        filters: [],
      };

      await workArea.loadElements([pathData1, pathData2]);

      expect(workArea.elements.length).toBe(2);
      expect(workArea.elements[0]).toBeInstanceOf(PathElement);
      expect(workArea.elements[1]).toBeInstanceOf(PathElement);
      expect((workArea.elements[0] as PathElement).layerName).toBe("Path 1");
      expect((workArea.elements[1] as PathElement).layerName).toBe("Path 2");
    });
  });
});
