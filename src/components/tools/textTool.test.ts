/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { EventBus } from "src/utils/eventBus";
import { TextTool } from "./textTool";

/**
 * @jest-environment jsdom
 */
describe("TextTool", () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let bus: EventBus;
  let tool: TextTool;

  beforeEach(() => {
    jest.clearAllMocks();
    canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 50;
    bus = new EventBus();
    tool = new TextTool(canvas, bus);
    // biome-ignore lint/style/noNonNullAssertion: context should exist after tool creation
    // biome-ignore lint/suspicious/noExplicitAny: accessing private variable
    ctx = (tool as any).context!;
    jest.spyOn(bus, "emit");
    jest.spyOn(ctx, "save");
    jest.spyOn(ctx, "strokeText");
    jest.spyOn(ctx, "fillText");
    jest.spyOn(ctx, "restore");
    tool.equip();
  });

  it("should emit tool:equipped and tool:unequipped", () => {
    expect(bus.emit).toHaveBeenCalledWith("tool:equipped", tool);
    (bus.emit as jest.Mock).mockClear();
    tool.unequip();
    expect(bus.emit).toHaveBeenCalledWith("tool:unequipped", tool);
  });

  it("onMouseDown emits edit:text with correct payload", () => {
    tool.onMouseDown({ offsetX: 15, offsetY: 25 } as MouseEvent);
    expect(bus.emit).toHaveBeenCalledWith("edit:text", {
      position: { x: 15, y: 25 },
    });
  });

  it("onMouseMove updates lastPosition and emits workarea:update", () => {
    tool.onMouseMove({ offsetX: 30, offsetY: 45 } as MouseEvent);
    // biome-ignore lint/suspicious/noExplicitAny: accessing private variable
    expect((tool as any).lastPosition).toEqual({ x: 30, y: 45 });
    expect(bus.emit).toHaveBeenCalledWith("workarea:update");
  });

  it("draw does nothing if lastPosition is null", () => {
    // tool.resetTool?.();
    tool.draw();
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
    expect(ctx.strokeText).not.toHaveBeenCalled();
  });

  it("draw renders cursor at lastPosition", () => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing private variable
    (tool as any).lastPosition = { x: 100, y: 200 };
    tool.draw();
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.strokeText).toHaveBeenCalledWith("T|", 100, 200);
    expect(ctx.fillText).toHaveBeenCalledWith("T|", 100, 200);
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("onKeyDown prevents default on Shift+Enter and Escape", () => {
    const e1 = {
      shiftKey: true,
      key: "Enter",
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent;
    const e2 = {
      shiftKey: false,
      key: "Escape",
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent;
    tool.onKeyDown(e1);
    tool.onKeyDown(e2);
    expect(e1.preventDefault).toHaveBeenCalled();
    expect(e2.preventDefault).toHaveBeenCalled();
  });
});
