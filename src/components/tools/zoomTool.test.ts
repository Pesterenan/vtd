import { ZoomTool } from "./zoomTool";
import { EventBus } from "../../utils/eventBus";

describe("ZoomTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let zoomTool: ZoomTool;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    eventBus = new EventBus();
    zoomTool = new ZoomTool(canvas, eventBus);
  });

  it("should set startingPosition on mouse down", () => {
    jest.spyOn(eventBus, "request").mockReturnValue([0.5]);
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
    jest.spyOn(eventBus, "request").mockReturnValue([0.5]);
    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 10,
      clientY: 20,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    zoomTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent("mousemove", {
      clientX: 150,
      clientY: 40,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 150 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 40 });
    zoomTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).toHaveBeenCalledWith("zoomLevel:change", {
      level: 1.1533333333333333,
      center: { x: 150, y: 40 },
    });
  });

  it("should reset startingPosition on mouse up", () => {
    jest.spyOn(eventBus, "request").mockReturnValue([0.5]);
    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 10,
      clientY: 20,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    zoomTool.onMouseDown(mouseDownEvent);

    zoomTool.onMouseUp(new MouseEvent("mouseup"));

    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseMoveEvent = new MouseEvent("mousemove", {
      clientX: 150,
      clientY: 40,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 150 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 40 });
    zoomTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).not.toHaveBeenCalled();
  });
});

