/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { EventBus } from "src/utils/eventBus";
import { GradientTool } from "./gradientTool";

/**
 * @jest-environment jsdom
 */
describe("GradientTool basic behavior", () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let bus: EventBus;
  let tool: GradientTool;

  beforeEach(() => {
    jest.clearAllMocks();
    canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    bus = new EventBus();
    tool = new GradientTool(canvas, bus);
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
    expect(bus.emit).toHaveBeenCalledWith("edit:gradient", {
      position: { x: 15, y: 25 },
    });
  });

  describe("click and drag sets explicit endpoints", () => {
    it("uses mouse down as start and mouse move/up as end", () => {
      tool.onMouseDown({ offsetX: 30, offsetY: 40 } as MouseEvent);
      tool.onMouseMove({
        offsetX: 150,
        offsetY: 120,
        shiftKey: false,
      } as MouseEvent);
      tool.onMouseUp();

      // biome-ignore lint/suspicious/noExplicitAny: accessing private variable
      expect((tool as any).startPosition).toEqual({ x: 30, y: 40 });
      // biome-ignore lint/suspicious/noExplicitAny: accessing private variable
      expect((tool as any).endPosition).toEqual({ x: 150, y: 120 });
    });
  });
});
