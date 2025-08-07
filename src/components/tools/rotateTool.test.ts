import { RotateTool } from "./rotateTool";
import { EventBus } from "../../utils/eventBus";

describe("RotateTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let rotateTool: RotateTool;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    eventBus = new EventBus();
    rotateTool = new RotateTool(canvas, eventBus);
  });

  it("should change anchor point on alt-click", () => {
    const emitSpy = jest.spyOn(eventBus, "emit");
    const requestSpy = jest.spyOn(eventBus, "request").mockReturnValue([
      {
        x: 10,
        y: 20,
      },
    ]);
    const mouseDownEvent = new MouseEvent("mousedown", {
      altKey: true,
    }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });

    rotateTool.onMouseDown(mouseDownEvent);

    expect(requestSpy).toHaveBeenCalledWith("workarea:adjustForCanvas", {
      position: { x: 10, y: 20 },
    });
    expect(emitSpy).toHaveBeenCalledWith("transformBox:anchorPoint:change", {
      position: { x: 10, y: 20 },
    });
    expect(emitSpy).toHaveBeenCalledWith("workarea:update");
  });

  it("should start rotating on mouse down", () => {
    const requestSpy = jest.spyOn(eventBus, "request").mockReturnValue([
      {
        x: 10,
        y: 20,
      },
    ]);
    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });

    rotateTool.onMouseDown(mouseDownEvent);

    expect(requestSpy).toHaveBeenCalledWith("workarea:adjustForCanvas", {
      position: { x: 10, y: 20 },
    });
    expect(emitSpy).toHaveBeenCalledWith("workarea:update");
  });

  it("should update rotation on mouse move", () => {
    const requestSpy = jest
      .spyOn(eventBus, "request")
      .mockReturnValueOnce([{ x: 10, y: 0 }])
      .mockReturnValueOnce([{ x: 0, y: 0 }])
      .mockReturnValueOnce([{ x: 10, y: 10 }])
      .mockReturnValueOnce([0]);

    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 0 });
    rotateTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent("mousemove") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 10 });
    rotateTool.onMouseMove(mouseMoveEvent);

    expect(requestSpy).toHaveBeenCalledWith("workarea:adjustForCanvas", {
      position: { x: 10, y: 10 },
    });
    expect(emitSpy).toHaveBeenCalledWith("transformBox:updateRotation", {
      delta: 45,
    });
  });

  it("should reset on mouse up", () => {
    jest.spyOn(eventBus, "request").mockReturnValue([{ x: 10, y: 20 }]);
    const mouseDownEvent = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    rotateTool.onMouseDown(mouseDownEvent);
    rotateTool.onMouseUp();

    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseMoveEvent = new MouseEvent("mousemove") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 20 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 30 });
    rotateTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).not.toHaveBeenCalledWith(
      "transformBox:updateRotation",
      expect.any(Object),
    );
  });
});
