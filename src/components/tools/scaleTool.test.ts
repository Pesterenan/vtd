import { ScaleTool } from "./scaleTool";
import { EventBus } from "../../utils/eventBus";

describe("ScaleTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let scaleTool: ScaleTool;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    eventBus = new EventBus();
    scaleTool = new ScaleTool(canvas, eventBus);
  });

  it("should change anchor point on alt-click", () => {
    const emitSpy = jest.spyOn(eventBus, "emit");
    const requestSpy = jest.spyOn(eventBus, "request").mockReturnValue([
      {
        x: 10,
        y: 20,
      },
    ]);
    const mouseDownEvent = new MouseEvent("mousedown", { altKey: true }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });

    scaleTool.onMouseDown(mouseDownEvent);

    expect(requestSpy).toHaveBeenCalledWith("workarea:adjustForCanvas", { position: { x: 10, y: 20 } });
    expect(emitSpy).toHaveBeenCalledWith("transformBox:anchorPoint:change", { position: { x: 10, y: 20 } });
    expect(emitSpy).toHaveBeenCalledWith("workarea:update");
  });

  it("should start scaling on mouse down", () => {
    const requestSpy = jest.spyOn(eventBus, "request")
      .mockReturnValueOnce([{ x: 10, y: 20 }])
      .mockReturnValueOnce([true]);
    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown") as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });

    scaleTool.onMouseDown(mouseDownEvent);

    expect(requestSpy).toHaveBeenCalledWith("workarea:adjustForCanvas", { position: { x: 10, y: 20 } });
    expect(emitSpy).toHaveBeenCalledWith("workarea:update");
  });

  it("should update scale on mouse move", () => {
    jest.spyOn(eventBus, "request")
      .mockReturnValueOnce([{ x: 10, y: 20 }])
      .mockReturnValueOnce([true])
      .mockReturnValueOnce([{ x: 20, y: 30 }])
      .mockReturnValueOnce([{ size: { width: 100, height: 100 }, rotation: 0 }])
      .mockReturnValueOnce([{ xSign: 1, ySign: 1, anchor: { x: 0, y: 0 } }]);

    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown") as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    scaleTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent("mousemove") as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 20 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 30 });
    scaleTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).toHaveBeenCalledWith("transformBox:updateScale", { delta: { x: 1.1, y: 1.1 }, anchor: { x: 0, y: 0 } });
  });

  it("should update proportional scale on mouse move", () => {
    jest.spyOn(eventBus, "request")
      .mockReturnValueOnce([{ x: 10, y: 20 }])
      .mockReturnValueOnce([true])
      .mockReturnValueOnce([{ x: 20, y: 30 }])
      .mockReturnValueOnce([{ size: { width: 100, height: 100 }, rotation: 0 }])
      .mockReturnValueOnce([{ xSign: 1, ySign: 1, anchor: { x: 0, y: 0 } }]);

    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown", { shiftKey: true }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    scaleTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent("mousemove") as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 20 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 30 });
    scaleTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).toHaveBeenCalledWith("transformBox:updateScale", { delta: { x: 1.1, y: 1.1 }, anchor: { x: 0, y: 0 } });
  });

  it("should reset on mouse up", () => {
    jest.spyOn(eventBus, "request")
      .mockReturnValueOnce([{ x: 10, y: 20 }])
      .mockReturnValueOnce([true])
      .mockReturnValueOnce([{ x: 20, y: 30 }])
      .mockReturnValueOnce([{ size: { width: 100, height: 100 }, rotation: 0 }])
      .mockReturnValueOnce([{ xSign: 1, ySign: 1, anchor: { x: 0, y: 0 } }]);
    const mouseDownEvent = new MouseEvent("mousedown") as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    scaleTool.onMouseDown(mouseDownEvent);
    scaleTool.onMouseUp();

    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseMoveEvent = new MouseEvent("mousemove") as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 20 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 30 });
    scaleTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).not.toHaveBeenCalledWith("transformBox:updateScale", expect.any(Object));
  });
});
