import { HandTool } from "./handTool";
import { EventBus } from "../../utils/eventBus";

describe("HandTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let handTool: HandTool;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    eventBus = new EventBus();
    handTool = new HandTool(canvas, eventBus);
  });

  it("should set lastPosition on mouse down", () => {
    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 10,
      clientY: 20,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });

    handTool.onMouseDown(mouseDownEvent);
    // We can't directly test private properties, so we test the effects.
    // In this case, onMouseDown alone doesn't have a visible effect until mouseMove.
  });

  it("should emit workarea:offset:change on mouse move", () => {
    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 10,
      clientY: 20,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    handTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent("mousemove", {
      clientX: 30,
      clientY: 40,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 30 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 40 });
    handTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).toHaveBeenCalledWith("workarea:offset:change", {
      position: { x: 20, y: 20 },
    });
  });

  it("should reset lastPosition on mouse up", () => {
    const mouseDownEvent = new MouseEvent("mousedown", {
      clientX: 10,
      clientY: 20,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    handTool.onMouseDown(mouseDownEvent);

    handTool.onMouseUp();

    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseMoveEvent = new MouseEvent("mousemove", {
      clientX: 30,
      clientY: 40,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 30 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 40 });
    handTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).not.toHaveBeenCalled();
  });
});

