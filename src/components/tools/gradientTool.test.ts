import { GradientTool } from "./gradientTool";
import { EventBus } from "../../utils/eventBus";
import type { Position } from "../types";

describe("GradientTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let gradientTool: GradientTool;
  let currentMouse: Position | null = null;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    eventBus = new EventBus();
    gradientTool = new GradientTool(canvas, eventBus);
    currentMouse = null;
    vi.spyOn(eventBus, "request").mockImplementation((event, payload) => {
      const pos = (payload as { position?: Position })?.position;
      if (event === "mouse:position:get") return currentMouse ? [currentMouse] : [];
      if (event === "workarea:adjustForCanvas" || event === "workarea:adjustForScreen") {
        if (pos) return [pos];
        return [];
      }
      if (event === "workarea:offset:get") return [{ x: 0, y: 0 }];
      if (event === "zoomLevel:get") return [1];
      if (event === "workarea:selected:get") return [[]];
      return [[]];
    });
  });

  it("should equip and unequip correctly", () => {
    const equipSpy = vi.spyOn(eventBus, "emit");
    gradientTool.equip();
    expect(equipSpy).toHaveBeenCalledWith("tool:equipped", gradientTool);

    const unequipSpy = vi.spyOn(eventBus, "emit");
    gradientTool.unequip();
    expect(unequipSpy).toHaveBeenCalledWith("tool:unequipped", gradientTool);
  });

  it("should create a new gradient on mouse drag", () => {
    const emitSpy = vi.spyOn(eventBus, "emit");
    currentMouse = { x: 10, y: 20 };
    const mouseDownEvent = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    gradientTool.onMouseDown(mouseDownEvent);

    currentMouse = { x: 100, y: 120 };
    const mouseMoveEvent = new MouseEvent("mousemove") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 100 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 120 });
    gradientTool.onMouseMove(mouseMoveEvent);

    expect(emitSpy).toHaveBeenCalledWith("edit:gradient", {
      position: { x: 10, y: 20 },
    });
  });
});
