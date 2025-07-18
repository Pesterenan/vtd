import { EventBus } from "src/utils/eventBus";
import { TextTool } from "./textTool";

describe("TextTool", () => {
  let canvas: HTMLCanvasElement;
  let bus: EventBus;
  let tool: TextTool;
  let context: CanvasRenderingContext2D;

  beforeEach(() => {
    jest.clearAllMocks();
    canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 50;
    bus = new EventBus();
    tool = new TextTool(canvas, bus);
    context = canvas.getContext("2d")!;
    jest.spyOn(bus, "emit");
  });

  it("should emit tool:equipped and tool:unequipped", () => {
    tool.equip();
    expect(bus.emit).toHaveBeenCalledWith("tool:equipped", tool);
    (bus.emit as jest.Mock).mockClear();
    tool.unequip();
    expect(bus.emit).toHaveBeenCalledWith("tool:unequipped", tool);
  });

  it("onMouseDown emits edit:text with correct payload", () => {
    const mouseDownEvent = new MouseEvent('mousedown') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, 'offsetX', { value: 15 });
    Object.defineProperty(mouseDownEvent, 'offsetY', { value: 25 });
    tool.onMouseDown(mouseDownEvent);
    expect(bus.emit).toHaveBeenCalledWith("edit:text", {
      position: { x: 15, y: 25 },
    });
  });

  it("onMouseMove updates lastPosition and emits workarea:update", () => {
    const mouseMoveEvent = new MouseEvent('mousemove') as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, 'offsetX', { value: 30 });
    Object.defineProperty(mouseMoveEvent, 'offsetY', { value: 45 });
    tool.onMouseMove(mouseMoveEvent);
    expect((tool as any).lastPosition).toEqual({ x: 30, y: 45 });
    expect(bus.emit).toHaveBeenCalledWith("workarea:update");
  });

  it("draw does nothing if lastPosition is null", () => {
    const saveSpy = jest.spyOn(context, "save");
    const fillTextSpy = jest.spyOn(context, "fillText");
    const strokeTextSpy = jest.spyOn(context, "strokeText");

    (tool as any).lastPosition = null;
    tool.draw();
    expect(saveSpy).not.toHaveBeenCalled();
    expect(fillTextSpy).not.toHaveBeenCalled();
    expect(strokeTextSpy).not.toHaveBeenCalled();
  });

  it("draw renders cursor at lastPosition", () => {
    const saveSpy = jest.spyOn(context, "save");
    const fillTextSpy = jest.spyOn(context, "fillText");
    const strokeTextSpy = jest.spyOn(context, "strokeText");
    const restoreSpy = jest.spyOn(context, "restore");

    (tool as any).lastPosition = { x: 100, y: 200 };
    tool.draw();
    expect(saveSpy).toHaveBeenCalled();
    expect(strokeTextSpy).toHaveBeenCalledWith("T|", 100, 200);
    expect(fillTextSpy).toHaveBeenCalledWith("T|", 100, 200);
    expect(restoreSpy).toHaveBeenCalled();
  });

  it("onKeyDown prevents default and emits edit:acceptTextChange on Shift+Enter", () => {
    const preventDefaultSpy = jest.fn();
    const keyboardEvent = new KeyboardEvent('keydown', { shiftKey: true, key: "Enter" });
    Object.defineProperty(keyboardEvent, 'preventDefault', { value: preventDefaultSpy });

    tool.onKeyDown(keyboardEvent);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(bus.emit).toHaveBeenCalledWith("edit:acceptTextChange");
  });

  it("onKeyDown prevents default and emits edit:declineTextChange on Escape", () => {
    const preventDefaultSpy = jest.fn();
    const keyboardEvent = new KeyboardEvent('keydown', { key: "Escape" });
    Object.defineProperty(keyboardEvent, 'preventDefault', { value: preventDefaultSpy });

    tool.onKeyDown(keyboardEvent);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(bus.emit).toHaveBeenCalledWith("edit:declineTextChange");
  });
});