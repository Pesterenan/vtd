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

describe("PenTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let penTool: PenTool;

  function mockSelected(selected: unknown[] | null = null) {
    vi.mocked(eventBus.request).mockImplementation((event, payload) => {
      const pos = (payload as { position?: { x?: number; y?: number } })
        ?.position;
      if (event === "workarea:selected:get") {
        return selected === null ? [[]] : [selected];
      }
      if (event === "workarea:adjustForCanvas") {
        return [{ x: pos?.x || 0, y: pos?.y || 0 }];
      }
      if (event === "workarea:adjustForScreen") {
        return [{ x: pos?.x || 0, y: pos?.y || 0 }];
      }
      if (event === "zoomLevel:get") {
        return [1];
      }
      return [];
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    eventBus = new EventBus();
    penTool = new PenTool(canvas, eventBus);
    vi.spyOn(eventBus, "emit");
    // Mock request: adjustForCanvas/adjustForScreen retornam identidade
    // e selected:get retorna seleção vazia por padrão
    vi.spyOn(eventBus, "request").mockImplementation((event, payload) => {
      const pos = (payload as { position?: { x?: number; y?: number } })
        ?.position;
      if (event === "workarea:selected:get") {
        return [[]];
      }
      if (event === "workarea:adjustForCanvas") {
        return [{ x: pos?.x || 0, y: pos?.y || 0 }];
      }
      if (event === "workarea:adjustForScreen") {
        return [{ x: pos?.x || 0, y: pos?.y || 0 }];
      }
      if (event === "zoomLevel:get") {
        return [1];
      }
      return [];
    });
  });

  it("should emit tool:equipped and set cursor to crosshair", () => {
    penTool.equip();
    expect(eventBus.emit).toHaveBeenCalledWith("tool:equipped", penTool);
    expect(canvas.style.cursor).toBe("crosshair");
  });

  it("should emit tool:unequipped and reset cursor", () => {
    penTool.unequip();
    expect(eventBus.emit).toHaveBeenCalledWith("tool:unequipped", penTool);
    expect(canvas.style.cursor).toBe("");
  });

  it("onMouseDown in IDLE state should start path and transition to DRAWING", () => {
    penTool.onMouseDown(createMouseEvent(100, 200));

    expect(penTool["state"]).toBe("DRAWING");
  });

  it("onMouseDown in DRAWING state should add point to screenPoints", () => {
    penTool.onMouseDown(createMouseEvent(100, 200));
    penTool.onMouseDown(createMouseEvent(300, 400));

    expect(penTool["state"]).toBe("DRAWING");
  });

  it("should auto-close path when click is within 8px of first point", () => {
    penTool.onMouseDown(createMouseEvent(100, 200));
    penTool.onMouseDown(createMouseEvent(500, 600));
    penTool.onMouseDown(createMouseEvent(104, 204));

    expect(eventBus.emit).toHaveBeenCalledWith("edit:path", {
      position: expect.anything(),
      points: expect.any(Array),
      isClosed: true,
    });
  });

  it("should finalize path as open when Enter is pressed with >= 2 points", () => {
    penTool.onMouseDown(createMouseEvent(100, 200));
    penTool.onMouseDown(createMouseEvent(500, 600));

    const keydownEvent = new KeyboardEvent("keydown", { code: "Enter" });
    penTool.onKeyDown(keydownEvent);

    expect(eventBus.emit).toHaveBeenCalledWith("edit:path", {
      position: expect.anything(),
      points: expect.any(Array),
      isClosed: false,
    });
  });

  it("should discard path when Escape is pressed", () => {
    penTool.onMouseDown(createMouseEvent(100, 200));
    penTool.onMouseDown(createMouseEvent(300, 400));

    const keydownEvent = new KeyboardEvent("keydown", { code: "Escape" });
    penTool.onKeyDown(keydownEvent);

    expect(penTool["state"]).toBe("IDLE");
  });

  it("Backspace should remove last point and return to IDLE when empty", () => {
    penTool.onMouseDown(createMouseEvent(100, 200));

    const keydownEvent = new KeyboardEvent("keydown", { code: "Backspace" });
    penTool.onKeyDown(keydownEvent);

    expect(penTool["state"]).toBe("IDLE");
  });

  it("unequip during DRAWING should finalize path as open if >= 2 points", () => {
    penTool.onMouseDown(createMouseEvent(100, 200));
    penTool.onMouseDown(createMouseEvent(500, 600));

    const unequipSpy = vi.spyOn(penTool, "unequip");
    penTool.unequip();

    expect(unequipSpy).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith("edit:path", {
      position: expect.anything(),
      points: expect.any(Array),
      isClosed: false,
    });
  });

  it("draw() should call canvas context methods for path preview", () => {
    penTool.onMouseDown(createMouseEvent(100, 200));
    penTool.onMouseDown(createMouseEvent(500, 600));
    penTool.onMouseMove(createMouseEvent(800, 900));

    const context = canvas.getContext("2d")!;
    const beginPathSpy = vi.spyOn(context, "beginPath");
    const lineToSpy = vi.spyOn(context, "lineTo");
    const arcSpy = vi.spyOn(context, "arc");
    const strokeSpy = vi.spyOn(context, "stroke");

    penTool.draw();

    expect(beginPathSpy).toHaveBeenCalled();
    expect(lineToSpy).toHaveBeenCalled(); // Called for each point and cursor
    expect(arcSpy).toHaveBeenCalledTimes(2); // One per point
    expect(strokeSpy).toHaveBeenCalled();
  });

  it("should handle right-click by ignoring in onMouseDown", () => {
    const evt = createMouseEvent(100, 200, { button: 2 });

    penTool.onMouseDown(evt);

    expect(penTool["state"]).toBe("IDLE");
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("onMouseMove should update cursor position and emit workarea:update in DRAWING state", () => {
    penTool.onMouseDown(createMouseEvent(100, 200));
    penTool.onMouseMove(createMouseEvent(300, 400));

    expect(eventBus.emit).toHaveBeenCalledWith("workarea:update");
  });

  it("should not finalize path when unequip with only 1 point", () => {
    penTool.onMouseDown(createMouseEvent(100, 200));

    const unequipSpy = vi.spyOn(penTool, "unequip");
    penTool.unequip();

    expect(unequipSpy).toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalledWith(
      "edit:path",
      expect.any(Object),
    );
  });

  describe("point editing", () => {
    let pathElement: PathElement;

    beforeEach(() => {
      pathElement = new PathElement(
        { x: 400, y: 300 },
        { width: 600, height: 400 },
        1,
      );
      // Pontos RELATIVOS ao position (400,300):
      // canvas abs: (200,150), (600,150), (600,450)
      pathElement.points = [
        { x: -200, y: -150 },
        { x: 200, y: -150 },
        { x: 200, y: 150 },
      ];
    });

    it("should NOT enter edit mode automatically on equip", () => {
      mockSelected([pathElement]);
      penTool.equip();

      expect(penTool["activePointIndex"]).toBeNull();
      expect(penTool["editElementId"]).toBeNull();
    });

    it("plain click draws a new path even with a path selected", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(100, 100));

      expect(penTool["state"]).toBe("DRAWING");
    });

    it("CTRL+click on a point enters EDIT_MOVING", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));

      expect(penTool["state"]).toBe("EDIT_MOVING");
      expect(penTool["activePointIndex"]).toBe(0);
    });

    it("CTRL+click far from any point does nothing (stays IDLE)", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(1000, 900, { ctrlKey: true }));

      expect(penTool["state"]).toBe("IDLE");
    });

    it("CTRL+click with no path selected stays IDLE", () => {
      mockSelected();
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));

      expect(penTool["state"]).toBe("IDLE");
    });

    it("EDIT_MOVING: mouse move updates the point using canvas coordinates", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      penTool.onMouseMove(createMouseEvent(300, 250));

      // canvasPos (300,250) convertido para local: (300-400, 250-300) = (-100,-50)
      expect(pathElement.points[0]).toEqual({ x: -100, y: -50 });
      expect(eventBus.emit).toHaveBeenCalledWith("workarea:update");
    });

    it("EDIT_MOVING: mouse up keeps active point selected", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["activePointIndex"]).toBe(0);
    });

    it("SHIFT+click on a segment sets insert target and splices on mouse up", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(600, 300, { shiftKey: true }));

      expect(penTool["insertMode"]).toBe(true);
      expect(penTool["insertPath"]).toBe(pathElement);
      expect(penTool["insertTargetIndex"]).not.toBeNull();
      expect(penTool["insertPointPos"]).toEqual({ x: 600, y: 300 });

      penTool.onMouseUp(new MouseEvent("mouseup"));

      // segment1 = vertical (600,150)-(600,450); clique (600,300) → insert no índice 2
      expect(pathElement.points.length).toBe(4);
      expect(pathElement.points[2]).toEqual({ x: 200, y: 0 });
      expect(penTool["insertMode"]).toBe(false);
    });

    it("SHIFT+click without a nearby target stays IDLE", () => {
      mockSelected();
      penTool.onMouseDown(createMouseEvent(1000, 900, { shiftKey: true }));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["insertMode"]).toBe(false);
    });

    it("ALT+click on a point removes it", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { altKey: true }));

      expect(pathElement.points.length).toBe(2);
    });

    it("ALT+click far from points stays IDLE", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(1000, 900, { altKey: true }));

      expect(penTool["state"]).toBe("IDLE");
    });

    it("should not remove the last point of a path", () => {
      const single = new PathElement({ x: 0, y: 0 }, { width: 10, height: 10 }, 2);
      single.points = [{ x: 10, y: 10 }];

      mockSelected([single]);
      penTool.onMouseDown(createMouseEvent(10, 10, { altKey: true }));

      expect(single.points.length).toBe(1);
    });

    it("Backspace removes the active point after selection", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));
      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Backspace" }));

      expect(pathElement.points.length).toBe(2);
    });

    it("Delete removes the active point", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(600, 150, { ctrlKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));
      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Delete" }));

      expect(pathElement.points.length).toBe(2);
    });

    it("Escape clears the active point selection", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));
      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Escape" }));

      expect(penTool["activePointIndex"]).toBeNull();
      expect(penTool["editElementId"]).toBeNull();
    });

    it("unequip clears edit state without touching the path", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      const pointsBefore = pathElement.points.length;

      penTool.unequip();

      expect(penTool["activePointIndex"]).toBeNull();
      expect(penTool["editElementId"]).toBeNull();
      expect(pathElement.points.length).toBe(pointsBefore);
    });

    it("serialize() does not contain edit state", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));

      const serialized = pathElement.serialize();

      expect(serialized).not.toHaveProperty("activePointIndex");
    });

    it("draw() renders edit handles for the selected path", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));

      const context = canvas.getContext("2d")!;
      const arcSpy = vi.spyOn(context, "arc");

      penTool.draw();

      // 3 pontos do path + 1 ponto ativo
      expect(arcSpy).toHaveBeenCalledTimes(4);
    });

    it("draw() renders the active handle at position-computed canvas coords", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));

      const context = canvas.getContext("2d")!;
      const arcCalls: Array<{ x: number; y: number; r: number }> = [];
      vi.spyOn(context, "arc").mockImplementation((x, y, r) => {
        arcCalls.push({ x, y, r });
      });

      penTool.draw();

      // ponto ativo (raio 6) = ponto local (-200,-150) + position (400,300)
      const active = arcCalls.find((call) => call.r > 3);
      expect(active).toBeDefined();
      expect(active!.x).toBe(200);
      expect(active!.y).toBe(150);
    });

    it("findClosestPoint hit-test scales the threshold by zoom level", () => {
      vi.mocked(eventBus.request).mockImplementation((event, payload) => {
        const pos = (payload as { position?: { x?: number; y?: number } })
          ?.position;
        if (event === "workarea:selected:get") return [[pathElement]];
        if (event === "zoomLevel:get") return [0.5];
        if (event === "workarea:adjustForCanvas")
          return [{ x: pos?.x || 0, y: pos?.y || 0 }];
        return [];
      });

      // ponto 0 no canvas (200,150); clique a 10px (fora dos 8px a zoom 1)
      penTool.onMouseDown(createMouseEvent(200, 160, { ctrlKey: true }));

      // zoom 0.5 → threshold 16 → entra EDIT_MOVING
      expect(penTool["state"]).toBe("EDIT_MOVING");
      expect(penTool["activePointIndex"]).toBe(0);
    });

    it("CTRL+click 10px from a point with no path near stays IDLE", () => {
      mockSelected([pathElement]);

      penTool.onMouseDown(createMouseEvent(200, 160, { ctrlKey: true }));

      // (200,160) está a 10px de um ponto, fora dos 8px (zoom 1) → sem hit
      expect(penTool["state"]).toBe("IDLE");
    });

    it("Escape during EDIT_MOVING returns to IDLE and clears selection", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      expect(penTool["state"]).toBe("EDIT_MOVING");

      penTool.onKeyDown(new KeyboardEvent("keydown", { code: "Escape" }));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["activePointIndex"]).toBeNull();
      expect(penTool["editElementId"]).toBeNull();
    });

    it("recomputeBounds recentralizes points, adjusts position and updates size", () => {
      const p = new PathElement({ x: 860, y: 422 }, { width: 10, height: 10 }, 1);
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

    it("recomputeBounds preserves the rendered path with scale and rotation", () => {
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

      const render = (position: Position, points: Point[]) =>
        points.map((pt) => {
          const scaled = { x: pt.x * 2, y: pt.y * 1 };
          const rotated = rotatePoint(scaled, { x: 0, y: 0 }, 90);
          return { x: rotated.x + position.x, y: rotated.y + position.y };
        });
      const before = render(p.position, p.points);

      penTool["recomputeBounds"](p);

      expect(render(p.position, p.points)).toEqual(before);
      expect(p.position).toEqual({ x: 490, y: 300 });
      expect(p.size).toEqual({ width: 20, height: 20 });
    });

    it("mouse up after moving a point recomputes the path bounds", () => {
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
      mockSelected([p]);

      penTool.onMouseDown(createMouseEvent(200, 150, { ctrlKey: true }));
      penTool.onMouseMove(createMouseEvent(100, 450));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      // ponto 0 foi para o canvas (100,450) → local (-300,150)
      expect(p.position).toEqual({ x: 350, y: 300 });
      expect(p.size).toEqual({ width: 500, height: 300 });
      expect(p.points[0]).toEqual({ x: -250, y: 150 });
    });

    it("SHIFT+click on a segment inserts a point on that segment (not a new path)", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(400, 150, { shiftKey: true }));

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["insertMode"]).toBe(true);

      penTool.onMouseUp(new MouseEvent("mouseup"));

      // segment0 = (200,150)-(600,150); clique em (400,150) → projeta (400,150)
      // local = (400-400, 150-300) = (0,-150), inserido no índice 1
      expect(pathElement.points.length).toBe(4);
      expect(pathElement.points[1]).toEqual({ x: 0, y: -150 });
      expect(penTool["insertMode"]).toBe(false);
      expect(penTool["insertPointPos"]).toBeNull();
      expect(penTool["insertTargetIndex"]).toBeNull();
    });

    it("insert mouseup does not throw and keeps the same selected path only", () => {
      mockSelected([pathElement]);
      const before = pathElement.elementId;

      penTool.onMouseDown(createMouseEvent(600, 300, { shiftKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      // segment1 = vertical (600,150)-(600,450); clique (600,300) → inserido ali
      expect(pathElement.elementId).toBe(before);
      expect(pathElement.points.length).toBe(4);
      expect(penTool["state"]).toBe("IDLE");
    });

    it("SHIFT+click exactly at a point still enables insert mode", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(600, 150, { shiftKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      // SHIFT sempre insere no segmento mais próximo, mesmo sobre um vértice
      expect(penTool["state"]).toBe("IDLE");
      expect(pathElement.points.length).toBe(4);
    });

    it("SHIFT+click on the closing segment of a closed path inserts a point", () => {
      const closed = new PathElement({ x: 400, y: 300 }, { width: 200, height: 300 }, 1);
      closed.isClosed = true;
      closed.points = [
        { x: -100, y: -150 },
        { x: 100, y: -150 },
        { x: 0, y: 150 },
      ];

      mockSelected([closed]);
      // segmento que fecha (p2->p0): canvas (400,450)-(300,150); ponto médio (350,300)
      penTool.onMouseDown(createMouseEvent(350, 300, { shiftKey: true }));

      expect(penTool["insertMode"]).toBe(true);
      penTool.onMouseUp(new MouseEvent("mouseup"));

      expect(closed.points.length).toBe(4);
      // local de (350,300) = (-50,0), inserido ao final (entre p2 e p0)
      expect(closed.points[3]).toEqual({ x: -50, y: 0 });
    });

    it("SHIFT-only hover (sem clique) mostra preview de inserção", () => {
      mockSelected([pathElement]);
      penTool.onMouseMove(createMouseEvent(400, 150, { shiftKey: true }));

      expect(penTool["previewPath"]).toBe(pathElement);
      expect(penTool["previewIndex"]).toBe(0);
      expect(penTool["previewPos"]).toEqual({ x: 400, y: 150 });
      // ainda não é um insert ativo
      expect(penTool["insertMode"]).toBe(false);
    });

    it("soltar o SHIFT limpa o preview", () => {
      mockSelected([pathElement]);
      penTool.onMouseMove(createMouseEvent(400, 150, { shiftKey: true }));
      expect(penTool["previewPath"]).not.toBeNull();

      penTool.onMouseMove(createMouseEvent(400, 150, {}));

      expect(penTool["previewPath"]).toBeNull();
      expect(penTool["previewPos"]).toBeNull();
    });

    it("insere o ponto exatamente onde o mouse está (sem projetar na linha)", () => {
      mockSelected([pathElement]);
      // (394,156) está a ~10px do segmento0 (y=150) - perto o bastante para hit,
      // mas fora da linha - o ponto deve ser inserido na posição do cursor.
      penTool.onMouseDown(createMouseEvent(394, 156, { shiftKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      expect(pathElement.points.length).toBe(4);
      // local de (394,156) = (394-400, 156-300) = (-6,-144)
      expect(pathElement.points[1]).toEqual({ x: -6, y: -144 });
    });

    it("insert mouseup re-seliciona o path para recalcular o transform box", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(400, 150, { shiftKey: true }));
      penTool.onMouseUp(new MouseEvent("mouseup"));

      expect(eventBus.emit).toHaveBeenCalledWith("workarea:selectById", {
        elementsId: new Set([pathElement.elementId]),
      });
    });

    it("unequip during insert mode clears insertion state completely", () => {
      mockSelected([pathElement]);
      penTool.onMouseDown(createMouseEvent(400, 150, { shiftKey: true }));
      expect(penTool["insertMode"]).toBe(true);

      penTool.unequip();

      expect(penTool["state"]).toBe("IDLE");
      expect(penTool["insertMode"]).toBe(false);
      expect(penTool["insertPointPos"]).toBeNull();
      expect(penTool["insertTargetIndex"]).toBeNull();
      expect(penTool["activePointIndex"]).toBeNull();
      expect(penTool["editElementId"]).toBeNull();
    });

    it("draw() renders edit handles for a selected path without a prior click", () => {
      mockSelected([pathElement]);
      penTool.equip();

      const context = canvas.getContext("2d")!;
      const arcSpy = vi.spyOn(context, "arc");

      penTool.draw();

      // 3 pontos do path, sem ponto ativo
      expect(arcSpy).toHaveBeenCalledTimes(3);
    });
  });
});
