import { GradientTool } from "./gradientTool";
import { EventBus } from "../../utils/eventBus";

describe("GradientTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let gradientTool: GradientTool;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    eventBus = new EventBus();
    gradientTool = new GradientTool(canvas, eventBus);
    jest.spyOn(eventBus, "request").mockReturnValue([[]]);
  });

  it("should equip and unequip correctly", () => {
    const equipSpy = jest.spyOn(eventBus, "emit");
    gradientTool.equip();
    expect(equipSpy).toHaveBeenCalledWith("tool:equipped", gradientTool);

    const unequipSpy = jest.spyOn(eventBus, "emit");
    gradientTool.unequip();
    expect(unequipSpy).toHaveBeenCalledWith("tool:unequipped", gradientTool);
  });

  it("should create a new gradient on mouse drag", () => {
    const emitSpy = jest.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    gradientTool.onMouseDown(mouseDownEvent);

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

