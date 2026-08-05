import { PenTool } from "./penTool";
import { EventBus } from "../../utils/eventBus";
import { PathElement } from "../elements/pathElement";
import { rotatePoint } from "src/utils/transforms";
import type { Point, Position } from "../types";

type MouseEventWithOffset = MouseEvent & {
  offsetX: number;
  offsetY: number;
};

function createMouseEvent(
  offsetX: number,
  offsetY: number,
  init: MouseEventInit = {},
): MouseEventWithOffset {
  const evt = new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: false,
    ...init,
  }) as MouseEventWithOffset;
  Object.defineProperty(evt, "offsetX", { value: offsetX });
  Object.defineProperty(evt, "offsetY", { value: offsetY });
  return evt;
}

function renderPath(
  points: Point[],
  position: Position,
  scale: { x: number; y: number },
  rotation: number,
): Position[] {
  return points.map((pt) => {
    const scaled = { x: pt.x * scale.x, y: pt.y * scale.y };
    const rotated = rotatePoint(scaled, { x: 0, y: 0 }, rotation);
    return { x: rotated.x + position.x, y: rotated.y + position.y };
  });
}

describe("PenTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let penTool: PenTool;
  let pathElement: PathElement;

  function configureRequest(overrides?: {
    selected?: unknown[] | null;
    elements?: unknown[];
    zoom?: number;
  }): void {
    const selected =
      overrides?.selected !== undefined ? overrides.selected : null;
    const elements = overrides?.elements ?? [];
    const zoom = overrides?.zoom ?? 1;
    vi.mocked(eventBus.request).mockImplementation((event, payload) => {
      const pos = (payload as { position?: { x?: number; y?: number } })
        ?.position;
      if (event === "workarea:selected:get") {
        return selected === null ? [[]] : [selected];
      }
      if (event === "workarea:elements:get") return [elements];
      if (
        event === "workarea:adjustForCanvas" ||
        event === "workarea:adjustForScreen"
      ) {
        return [{ x: pos?.x ?? 0, y: pos?.y ?? 0 }];
      }
      if (event === "zoomLevel:get") return [zoom];
      return [];
    });
  }

  function mockSelected(selected: unknown[] | null = null): void {
    configureRequest({ selected });
  }

  function mockElements(elements: unknown[]): void {
    configureRequest({ elements });
  }

  function makePath(): PathElement {
    const p = new PathElement(
      { x: 400, y: 300 },
      { width: 600, height: 400 },
      1,
    );
    p.points = [
      { x: -200, y: -150 },
      { x: 200, y: -150 },
      { x: 200, y: 150 },
    ];
    return p;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    eventBus = new EventBus();
    penTool = new PenTool(canvas, eventBus);
    vi.spyOn(eventBus, "emit");
    vi.spyOn(eventBus, "request");
    configureRequest();
    pathElement = makePath();
  });

  describe("equip e unequip", () => {
    it("equip emits tool:equipped and sets the cursor to crosshair", () => {
      penTool.equip();

      expect(eventBus.emit).toHaveBeenCalledWith("tool:equipped", penTool);
      expect(canvas.style.cursor).toBe("crosshair");
    });

    it("unequip emits tool:unequipped and clears the cursor", () => {
      penTool.equip();
      penTool.unequip();

      expect(eventBus.emit).toHaveBeenCalledWith("tool:unequipped", penTool);
      expect(canvas.style.cursor).toBe("");
    });

    it("unequip with no drawing state stays IDLE", () => {
      penTool.unequip();

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["points"]).toEqual([]);
      expect(eventBus.emit).not.toHaveBeenCalledWith(
        "edit:path",
        expect.any(Object),
      );
    });
  });

  describe("desenho de um novo path", () => {
    it("plain left-click in IDLE starts a new path (DRAWING)", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));

      expect(penTool["state"]).toBe("DRAWING");
      expect(penTool["points"]).toEqual([{ x: 100, y: 200 }]);
    });

    it("each further click adds a point", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onMouseDown(createMouseEvent(300, 400));

      expect(penTool["state"]).toBe("DRAWING");
      expect(penTool["points"]).toEqual([
        { x: 100, y: 200 },
        { x: 300, y: 400 },
      ]);
    });

    it("clicking within 8px of the first point closes the path", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onMouseDown(createMouseEvent(500, 600));
      penTool.onMouseDown(createMouseEvent(104, 204));

      expect(eventBus.emit).toHaveBeenCalledWith("edit:path", {
        position: { x: 300, y: 400 },
        points: [
          { x: 100, y: 200 },
          { x: 500, y: 600 },
        ],
        isClosed: true,
      });
      expect(penTool["state"]).toBe("IDLE");
    });

    it("a close click with only a single point still adds a point", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onMouseDown(createMouseEvent(104, 204));

      expect(penTool["state"]).toBe("DRAWING");
      expect(penTool["points"]).toHaveLength(2);
      expect(eventBus.emit).not.toHaveBeenCalledWith(
        "edit:path",
        expect.any(Object),
      );
    });

    it("Enter finalizes the path as open with >= 2 points", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onMouseDown(createMouseEvent(500, 600));
      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Enter" }));

      expect(eventBus.emit).toHaveBeenCalledWith("edit:path", {
        position: { x: 300, y: 400 },
        points: [
          { x: 100, y: 200 },
          { x: 500, y: 600 },
        ],
        isClosed: false,
      });
      expect(penTool["state"]).toBe("IDLE");
    });

    it("Enter with fewer than 2 points does nothing", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Enter" }));

      expect(penTool["state"]).toBe("DRAWING");
      expect(eventBus.emit).not.toHaveBeenCalledWith(
        "edit:path",
        expect.any(Object),
      );
    });

    it("Escape discards the drawing and emits an alert", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onMouseDown(createMouseEvent(500, 600));
      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Escape" }));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["points"]).toEqual([]);
      expect(eventBus.emit).toHaveBeenCalledWith("alert:add", {
        type: "success",
        message: "Caminho descartado",
      });
    });

    it("Backspace removes the last point and discards when empty", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Backspace" }));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["points"]).toEqual([]);
      expect(eventBus.emit).not.toHaveBeenCalledWith(
        "alert:add",
        expect.any(Object),
      );
    });

    it("Backspace with 2 points keeps DRAWING with a single point", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onMouseDown(createMouseEvent(500, 600));
      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Backspace" }));

      expect(penTool["state"]).toBe("DRAWING");
      expect(penTool["points"]).toEqual([{ x: 100, y: 200 }]);
    });

    it("mouse move near the first point flags the closing preview", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onMouseDown(createMouseEvent(500, 600));
      penTool.onMouseMove(createMouseEvent(104, 204));

      expect(penTool["isClosing"]).toBe(true);

      penTool.onMouseMove(createMouseEvent(700, 800));

      expect(penTool["isClosing"]).toBe(false);
    });

    it("right-click (button 2) is ignored in IDLE", () => {
      penTool.onMouseDown(createMouseEvent(100, 200, { button: 2 }));

      expect(penTool["state"]).toBe("IDLE");
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it("right-click during DRAWING does not add a point", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onMouseDown(createMouseEvent(500, 600));
      penTool.onMouseDown(createMouseEvent(700, 700, { button: 2 }));

      expect(penTool["state"]).toBe("DRAWING");
      expect(penTool["points"]).toHaveLength(2);
    });

    it("unequip during DRAWING finalizes the path as open", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onMouseDown(createMouseEvent(500, 600));

      penTool.unequip();

      expect(eventBus.emit).toHaveBeenCalledWith("edit:path", {
        position: { x: 300, y: 400 },
        points: [
          { x: 100, y: 200 },
          { x: 500, y: 600 },
        ],
        isClosed: false,
      });
      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["points"]).toEqual([]);
    });

    it("unequip during DRAWING with a single point discards silently", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));

      penTool.unequip();

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["points"]).toEqual([]);
      expect(eventBus.emit).not.toHaveBeenCalledWith(
        "edit:path",
        expect.any(Object),
      );
    });
  });

  describe("edição de pontos com CTRL/meta", () => {
    it("CTRL+click near a point enters EDIT_MOVING and sets the active point", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));

      expect(penTool["state"]).toBe("EDIT_MOVING");
      expect(penTool["activePointIndex"]).toBe(0);
      expect(penTool["editPath"]).toBe(pathElement);
    });

    it("meta+click near a point also enters EDIT_MOVING", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { metaKey: true }));

      expect(penTool["state"]).toBe("EDIT_MOVING");
      expect(penTool["activePointIndex"]).toBe(0);
    });

    it("CTRL+click near a segment only sets editPath but stays IDLE", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(400, 150, { ctrlKey: true }));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["activePointIndex"]).toBeNull();
      expect(penTool["editPath"]).toBe(pathElement);
    });

    it("CTRL+click far from the path stays IDLE without a target", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(1000, 900, { ctrlKey: true }));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["editPath"]).toBeNull();
      expect(penTool["activePointIndex"]).toBeNull();
    });

    it("CTRL+click with no selected path stays IDLE", () => {
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["activePointIndex"]).toBeNull();
    });

    it("CTRL+click detects the path from the elements list too", () => {
      mockElements([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));

      expect(penTool["state"]).toBe("EDIT_MOVING");
      expect(penTool["activePointIndex"]).toBe(0);
    });

    it("drag while EDIT_MOVING moves the point in local coordinates", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      penTool.onMouseMove(createMouseEvent(300, 250));

      expect(pathElement.points[0]).toEqual({ x: -100, y: -50 });
    });

    it("mouse up after dragging recomputes bounds and reselects the path", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      penTool.onMouseMove(createMouseEvent(300, 250));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      expect(penTool["state"]).toBe("IDLE");
      expect(pathElement.position).toEqual({ x: 450, y: 300 });
      expect(pathElement.size).toEqual({ width: 300, height: 300 });
      expect(pathElement.points[0]).toEqual({ x: -150, y: -50 });
      expect(eventBus.emit).toHaveBeenCalledWith("workarea:selectById", {
        elementsId: new Set([pathElement.elementId]),
      });
    });

    it("drag converts the canvas position back through scale and rotation", () => {
      const rotated = new PathElement(
        { x: 400, y: 300 },
        { width: 100, height: 100 },
        1,
      );
      rotated.rotation = 90;
      rotated.scale = { x: 2, y: 1 };
      rotated.points = [
        { x: 10, y: -10 },
        { x: -10, y: -10 },
        { x: 0, y: 10 },
      ];
      mockSelected([rotated]);

      penTool.onMouseDown(createMouseEvent(410, 320, { ctrlKey: true }));
      expect(penTool["state"]).toBe("EDIT_MOVING");
      expect(penTool["activePointIndex"]).toBe(0);

      penTool.onMouseMove(createMouseEvent(500, 400));

      expect(rotated.points[0]).toEqual({ x: 50, y: -100 });
    });

    it("click threshold scales with the zoom level", () => {
      configureRequest({ selected: [pathElement], zoom: 0.5 });
      penTool.onMouseDown(createMouseEvent(200, 160, { ctrlKey: true }));

      expect(penTool["state"]).toBe("EDIT_MOVING");
      expect(penTool["activePointIndex"]).toBe(0);
    });

    it("a point 10px away stays out of range at zoom level 2", () => {
      configureRequest({ selected: [pathElement], zoom: 2 });
      penTool.onMouseDown(createMouseEvent(200, 160, { ctrlKey: true }));

      expect(penTool["state"]).toBe("IDLE");
    });

    it("draw() renders edit handles for the edited path", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(400, 150, { ctrlKey: true }));

      const context = canvas.getContext("2d")!;
      const arcSpy = vi.spyOn(context, "arc");

      penTool.draw();

      expect(arcSpy).toHaveBeenCalledTimes(3);
    });

    it("draw() renders the active handle at the point canvas position", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));

      const context = canvas.getContext("2d")!;
      const arcCalls: Array<{ x: number; y: number; r: number }> = [];
      vi.spyOn(context, "arc").mockImplementation((x, y, r) => {
        arcCalls.push({ x, y, r });
      });

      penTool.draw();

      const active = arcCalls.find((call) => call.r > 3);
      expect(active).toBeDefined();
      expect(active!.x).toBe(200);
      expect(active!.y).toBe(150);
    });
  });

  describe("inserção de ponto com SHIFT", () => {
    it("SHIFT+click on a segment enters EDIT_ADDING with an insert ghost", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(600, 300, { shiftKey: true }));

      expect(penTool["state"]).toBe("EDIT_ADDING");
      expect(penTool["ghost"]).toMatchObject({
        kind: "insert",
        path: pathElement,
        index: 1,
        pos: { x: 600, y: 300 },
      });
    });

    it("mouse up splices a new point between the segment endpoints", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(600, 300, { shiftKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      expect(pathElement.points).toHaveLength(4);
      expect(pathElement.points[2]).toEqual({ x: 200, y: 0 });
      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["ghost"]).toBeNull();
      expect(penTool["activePointIndex"]).toBeNull();
    });

    it("mouse move during EDIT_ADDING follows the nearest segment", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(600, 300, { shiftKey: true }));
      penTool.onMouseMove(createMouseEvent(400, 150));

      expect(penTool["ghost"]).toMatchObject({ kind: "insert", index: 0 });

      penTool.onMouseUp(new MouseEvent("mouseup"));

      expect(pathElement.points[1]).toEqual({ x: 0, y: -150 });
    });

    it("SHIFT hover in IDLE over a segment shows an insert preview", () => {
      mockSelected([pathElement]);
      penTool.onMouseMove(createMouseEvent(400, 150, { shiftKey: true }));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["ghost"]).toMatchObject({
        kind: "insert",
        path: pathElement,
        index: 0,
        pos: { x: 400, y: 150 },
      });
    });

    it("releasing SHIFT clears the insert preview", () => {
      mockSelected([pathElement]);
      penTool.onMouseMove(createMouseEvent(400, 150, { shiftKey: true }));
      expect(penTool["ghost"]).not.toBeNull();

      penTool.onMouseMove(createMouseEvent(400, 150));

      expect(penTool["ghost"]).toBeNull();
    });

    it("SHIFT hover far from any path keeps the ghost empty", () => {
      mockSelected([pathElement]);
      penTool.onMouseMove(createMouseEvent(1000, 900, { shiftKey: true }));

      expect(penTool["ghost"]).toBeNull();
      expect(penTool["state"]).toBe("IDLE");
    });

    it("SHIFT+click with no editable path nearby stays IDLE", () => {
      penTool.onMouseDown(createMouseEvent(1000, 900, { shiftKey: true }));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["ghost"]).toBeNull();
    });

    it("SHIFT+click on the closing segment of a closed path inserts a point", () => {
      const closed = new PathElement(
        { x: 400, y: 300 },
        { width: 200, height: 300 },
        1,
      );
      closed.isClosed = true;
      closed.points = [
        { x: -100, y: -150 },
        { x: 100, y: -150 },
        { x: 0, y: 150 },
      ];
      mockSelected([closed]);

      penTool.onMouseDown(createMouseEvent(350, 300, { shiftKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      expect(closed.points).toHaveLength(4);
      expect(closed.points[3]).toEqual({ x: -50, y: 0 });
    });

    it("mouse up after an insert reselects the path", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(400, 150, { shiftKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      expect(eventBus.emit).toHaveBeenCalledWith("workarea:selectById", {
        elementsId: new Set([pathElement.elementId]),
      });
    });

    it("unequip during an active insert clears all editing state", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(600, 300, { shiftKey: true }));
      expect(penTool["state"]).toBe("EDIT_ADDING");

      penTool.unequip();

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["ghost"]).toBeNull();
      expect(penTool["activePointIndex"]).toBeNull();
      expect(penTool["editPath"]).toBeNull();
      expect(pathElement.points).toHaveLength(3);
    });
  });

  describe("extensão com SHIFT a partir de um extremo", () => {
    function selectFirstPoint(): void {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));
    }

    it("SHIFT+click with the first point active extends the path from the start", () => {
      selectFirstPoint();
      expect(penTool["activePointIndex"]).toBe(0);

      penTool.onMouseDown(createMouseEvent(100, 150, { shiftKey: true }));

      expect(pathElement.points).toHaveLength(4);
      expect(penTool["activePointIndex"]).toBe(0);
      expect(pathElement.isClosed).toBe(false);
      expect(penTool["state"]).toBe("IDLE");
    });

    it("the new point lands at the cursor and the rendering is preserved", () => {
      selectFirstPoint();

      penTool.onMouseDown(createMouseEvent(100, 150, { shiftKey: true }));

      expect(pathElement.position).toEqual({ x: 350, y: 300 });
      expect(pathElement.points[0]).toEqual({ x: -250, y: -150 });
    });

    it("SHIFT+click with the last point active extends from the end", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(600, 450, { ctrlKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));
      expect(penTool["activePointIndex"]).toBe(2);

      penTool.onMouseDown(createMouseEvent(600, 500, { shiftKey: true }));

      expect(pathElement.points).toHaveLength(4);
      expect(penTool["activePointIndex"]).toBe(3);
      expect(pathElement.isClosed).toBe(false);
    });

    it("SHIFT+click on the opposite endpoint closes the path", () => {
      selectFirstPoint();
      penTool.onMouseDown(createMouseEvent(100, 150, { shiftKey: true }));

      penTool.onMouseDown(createMouseEvent(600, 450, { shiftKey: true }));

      expect(pathElement.isClosed).toBe(true);
      expect(penTool["activePointIndex"]).toBeNull();
    });

    it("SHIFT hover near the opposite endpoint shows a closing preview", () => {
      selectFirstPoint();

      penTool.onMouseMove(createMouseEvent(600, 450, { shiftKey: true }));

      expect(penTool["ghost"]).toMatchObject({
        kind: "extend",
        path: pathElement,
        side: "start",
        closing: true,
      });
    });

    it("SHIFT hover away from the opposite endpoint shows a non-closing extension", () => {
      selectFirstPoint();

      penTool.onMouseMove(createMouseEvent(650, 450, { shiftKey: true }));

      expect(penTool["ghost"]).toMatchObject({
        kind: "extend",
        path: pathElement,
        side: "start",
        closing: false,
      });
    });

    it("SHIFT+click without an active endpoint falls back to insertion", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(400, 150, { shiftKey: true }));

      expect(penTool["state"]).toBe("EDIT_ADDING");
      expect(penTool["ghost"]).toMatchObject({ kind: "insert" });
    });
  });

  describe("remoção de pontos com ALT", () => {
    it("ALT hover detects a point but the move preview clears the ghost", () => {
      mockSelected([pathElement]);
      penTool.onMouseMove(createMouseEvent(200, 150, { altKey: true }));

      expect(penTool["ghost"]).toBeNull();
      expect(penTool["state"]).toBe("IDLE");
    });

    it("ALT+click removes the hovered point", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { altKey: true }));

      expect(pathElement.points).toHaveLength(2);
      expect(penTool["ghost"]).toBeNull();
    });

    it("ALT cannot reduce a 2-point path to a single point", () => {
      const two = new PathElement(
        { x: 0, y: 0 },
        { width: 20, height: 20 },
        1,
      );
      two.points = [
        { x: 10, y: 10 },
        { x: -10, y: -10 },
      ];
      mockSelected([two]);

      penTool.onMouseDown(createMouseEvent(10, 10, { altKey: true }));

      expect(two.points).toHaveLength(2);
    });

    it("ALT+click near a segment (not a point) does nothing", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(400, 150, { altKey: true }));

      expect(pathElement.points).toHaveLength(3);
      expect(penTool["state"]).toBe("IDLE");
    });

    it("ALT hover far from the path clears any removal ghost", () => {
      mockSelected([pathElement]);
      penTool.onMouseMove(createMouseEvent(1000, 900, { altKey: true }));

      expect(penTool["ghost"]).toBeNull();
    });
  });

  describe("teclado em modo de edição", () => {
    it("Backspace with an active point removes it", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Backspace" }));

      expect(pathElement.points).toHaveLength(2);
    });

    it("Delete with an active point removes it", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(600, 150, { ctrlKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Delete" }));

      expect(pathElement.points).toHaveLength(2);
    });

    it("Delete with no active point does nothing", () => {
      mockSelected([pathElement]);
      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Delete" }));

      expect(pathElement.points).toHaveLength(3);
    });

    it("Escape clears the active point selection", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Escape" }));

      expect(penTool["activePointIndex"]).toBeNull();
      expect(penTool["editElementId"]).toBeNull();
      expect(penTool["editPath"]).toBeNull();
    });

    it("Escape during EDIT_MOVING returns to IDLE", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      expect(penTool["state"]).toBe("EDIT_MOVING");

      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Escape" }));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["activePointIndex"]).toBeNull();
    });
  });

  describe("recomputeBounds e transform box", () => {
    it("recomputeBounds recentres points and updates position and size", () => {
      const p = new PathElement(
        { x: 860, y: 422 },
        { width: 10, height: 10 },
        1,
      );
      p.points = [
        { x: 100, y: 119 },
        { x: -392, y: -222 },
        { x: 291, y: -290 },
        { x: 393, y: 222 },
        { x: -324, y: 290 },
      ];

      penTool["recomputeBounds"](p);

      expect(p.position).toEqual({ x: 860.5, y: 422 });
      expect(p.size).toEqual({ width: 785, height: 580 });
      expect(p.points[0]).toEqual({ x: 99.5, y: 119 });
      expect(p.points[3]).toEqual({ x: 392.5, y: 222 });
      expect(p.points[4]).toEqual({ x: -324.5, y: 290 });
    });

    it("recomputeBounds preserves the rendered geometry with scale and rotation", () => {
      const p = new PathElement(
        { x: 500, y: 300 },
        { width: 10, height: 10 },
        1,
      );
      p.scale = { x: 2, y: 1 };
      p.rotation = 90;
      p.points = [
        { x: 10, y: 0 },
        { x: -10, y: 0 },
        { x: 0, y: 20 },
      ];

      const before = renderPath(p.points, p.position, p.scale, p.rotation);

      penTool["recomputeBounds"](p);

      expect(renderPath(p.points, p.position, p.scale, p.rotation)).toEqual(
        before,
      );
      expect(p.position).toEqual({ x: 490, y: 300 });
      expect(p.size).toEqual({ width: 20, height: 20 });
    });

    it("recomputeBounds does nothing when there are no points", () => {
      const p = new PathElement(
        { x: 500, y: 300 },
        { width: 10, height: 10 },
        1,
      );
      p.points = [];

      expect(() => penTool["recomputeBounds"](p)).not.toThrow();
      expect(p.points).toEqual([]);
    });
  });

  describe("robustez com eventBus inválido", () => {
    it("getSelectedPath returns null when selection is empty", () => {
      expect(penTool["getSelectedPath"]()).toBeNull();
    });

    it("getSelectedPath returns null when the selection is not a PathElement", () => {
      configureRequest({ selected: [{ type: "image" }] });

      expect(penTool["getSelectedPath"]()).toBeNull();
    });

    it("finalizePath aborts when adjustForCanvas returns undefined", () => {
      vi.mocked(eventBus.request).mockImplementation((event) => {
        if (event === "workarea:adjustForCanvas") return [undefined];
        if (event === "zoomLevel:get") return [1];
        return [];
      });

      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onMouseDown(createMouseEvent(500, 600));

      expect(() =>
        penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Enter" })),
      ).not.toThrow();
      expect(eventBus.emit).not.toHaveBeenCalledWith(
        "edit:path",
        expect.any(Object),
      );
    });

    it("finalizePath with no points does not crash", () => {
      expect(() => penTool["finalizePath"](false)).not.toThrow();
      expect(eventBus.emit).not.toHaveBeenCalledWith(
        "edit:path",
        expect.any(Object),
      );
    });

    it("unequip tolerates a throwing adjustForCanvas during finalize", () => {
      vi.mocked(eventBus.request).mockImplementation((event) => {
        if (event === "workarea:adjustForCanvas") throw new Error("boom");
        return [];
      });

      penTool.onMouseDown(createMouseEvent(100, 200));
      penTool.onMouseDown(createMouseEvent(500, 600));

      expect(() => penTool.unequip()).not.toThrow();
      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["points"]).toEqual([]);
    });

    it("draw() does not crash without a selection or draft state", () => {
      expect(() => penTool.draw()).not.toThrow();
    });
  });
});
