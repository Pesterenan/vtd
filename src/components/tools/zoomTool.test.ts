import { ZoomTool } from "./zoomTool";
import { EventBus } from "../../utils/eventBus";
import type { Position } from "../types";

describe("ZoomTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let zoomTool: ZoomTool;
  let currentMouse: Position | null = null;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 800;
    eventBus = new EventBus();
    zoomTool = new ZoomTool(canvas, eventBus);
    currentMouse = null;
    vi.spyOn(eventBus, "request").mockImplementation((event, payload) => {
      const pos = (payload as { position?: Position })?.position;
      if (event === "zoomLevel:get") return [0.5];
      if (event === "mouse:position:get") return currentMouse ? [currentMouse] : [];
      if (event === "workarea:adjustForCanvas" || event === "workarea:adjustForScreen") {
        if (pos) return [pos];
        return [];
      }
      if (event === "workarea:offset:get") return [{ x: 0, y: 0 }];
      return [];
    });
  });

  it("should set starting position on mouse down", () => {
    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 10,
      clientY: 20,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });

    zoomTool.onMouseDown(mouseDownEvent);
    // We can't directly test private properties, so we test the effects.
    // In this case, onMouseDown alone doesn't have a visible effect until mouseMove.
  });

  it("should emit zoomLevel:change on mouse move", () => {
    const emitSpy = vi.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 10,
      clientY: 20,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    currentMouse = { x: 10, y: 20 };
    zoomTool.onMouseDown(mouseDownEvent);
    emitSpy.mockClear();

    currentMouse = { x: 150, y: 40 };
    const mouseMoveEvent = new MouseEvent("mousemove", {
      clientX: 150,
      clientY: 40,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 150 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 40 });
    zoomTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).toHaveBeenCalledWith("zoomLevel:change", {
      level: expect.any(Number),
      center: { x: 150, y: 40 },
    });
    const call = emitSpy.mock.calls.find((c) => c[0] === "zoomLevel:change") as unknown as [string, { level: number; center: Position }];
    expect(call[1].level).toBeGreaterThan(0.5);
    expect(call[1].level).toBeLessThan(2);
  });

  it("should reset startingPosition on mouse up", () => {
    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 10,
      clientY: 20,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    currentMouse = { x: 10, y: 20 };
    zoomTool.onMouseDown(mouseDownEvent);

    zoomTool.onMouseUp(new MouseEvent("mouseup"));

    const emitSpy = vi.spyOn(eventBus, "emit");
    currentMouse = { x: 150, y: 40 };
    const mouseMoveEvent = new MouseEvent("mousemove", {
      clientX: 150,
      clientY: 40,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 150 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 40 });
    zoomTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).not.toHaveBeenCalledWith("zoomLevel:change", expect.anything());
  });
});
