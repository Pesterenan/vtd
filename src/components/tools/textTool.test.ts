import type { Mock } from "vitest";
import { EventBus } from "src/utils/eventBus";
import { TextTool } from "./textTool";
import type { Position } from "../types";

describe("TextTool", () => {
  let canvas: HTMLCanvasElement;
  let bus: EventBus;
  let tool: TextTool;
  let context: CanvasRenderingContext2D;
  let currentMouse: Position | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 50;
    bus = new EventBus();
    tool = new TextTool(canvas, bus);
    context = canvas.getContext("2d")!;
    currentMouse = null;
    vi.spyOn(bus, "request").mockImplementation((event, payload) => {
      const pos = (payload as { position?: Position })?.position;
      if (event === "mouse:position:get") return currentMouse ? [currentMouse] : [];
      if (event === "workarea:adjustForCanvas" || event === "workarea:adjustForScreen") {
        if (pos) return [pos];
        return [];
      }
      if (event === "workarea:offset:get") return [{ x: 0, y: 0 }];
      if (event === "zoomLevel:get") return [1];
      return [];
    });
    vi.spyOn(bus, "emit");
  });

  it("should emit tool:equipped and tool:unequipped", () => {
    tool.equip();
    expect(bus.emit).toHaveBeenCalledWith("tool:equipped", tool);
    (bus.emit as Mock).mockClear();
    tool.unequip();
    expect(bus.emit).toHaveBeenCalledWith("tool:unequipped", tool);
  });

  it("onMouseDown emits edit:text with correct payload", () => {
    currentMouse = { x: 15, y: 25 };
    const mouseDownEvent = new MouseEvent("mousedown", { clientX: 15, clientY: 25 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 15 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 25 });
    tool.onMouseDown(mouseDownEvent);
    expect(bus.emit).toHaveBeenCalledWith("edit:text", {
      position: { x: 15, y: 25 },
    });
  });

  it("onMouseMove updates lastPosition and emits workarea:update", () => {
    currentMouse = { x: 30, y: 45 };
    const mouseMoveEvent = new MouseEvent("mousemove", { clientX: 30, clientY: 45 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 30 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 45 });
    tool.onMouseMove(mouseMoveEvent);
    expect(bus.emit).toHaveBeenCalledWith("workarea:update");
  });

  it("draw does nothing if lastPosition is null", () => {
    const saveSpy = vi.spyOn(context, "save");
    const fillTextSpy = vi.spyOn(context, "fillText");
    const strokeTextSpy = vi.spyOn(context, "strokeText");

    tool.draw();
    expect(saveSpy).not.toHaveBeenCalled();
    expect(fillTextSpy).not.toHaveBeenCalled();
    expect(strokeTextSpy).not.toHaveBeenCalled();
  });

  it("draw renders cursor at lastPosition", () => {
    const saveSpy = vi.spyOn(context, "save");
    const fillTextSpy = vi.spyOn(context, "fillText");
    const strokeTextSpy = vi.spyOn(context, "strokeText");
    const restoreSpy = vi.spyOn(context, "restore");

    currentMouse = { x: 100, y: 200 };
    const mouseMoveEvent = new MouseEvent("mousemove", { clientX: 100, clientY: 200 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 100 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 200 });
    tool.onMouseMove(mouseMoveEvent);

    tool.draw();
    expect(saveSpy).toHaveBeenCalled();
    expect(strokeTextSpy).toHaveBeenCalledWith("T|", 100, 200);
    expect(fillTextSpy).toHaveBeenCalledWith("T|", 100, 200);
    expect(restoreSpy).toHaveBeenCalled();
  });

  it("onKeyDown prevents default and emits edit:acceptTextChange on Shift+Enter", () => {
    const preventDefaultSpy = vi.fn();
    const keyboardEvent = new KeyboardEvent("keydown", { shiftKey: true, key: "Enter" });
    Object.defineProperty(keyboardEvent, "preventDefault", { value: preventDefaultSpy });

    tool.onKeyDown(keyboardEvent);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(bus.emit).toHaveBeenCalledWith("edit:acceptTextChange");
  });

  it("onKeyDown prevents default and emits edit:declineTextChange on Escape", () => {
    const preventDefaultSpy = vi.fn();
    const keyboardEvent = new KeyboardEvent("keydown", { key: "Escape" });
    Object.defineProperty(keyboardEvent, "preventDefault", { value: preventDefaultSpy });

    tool.onKeyDown(keyboardEvent);
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(bus.emit).toHaveBeenCalledWith("edit:declineTextChange");
  });
});
