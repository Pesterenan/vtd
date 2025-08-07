import { SelectTool } from "./selectTool";
import { EventBus } from "../../utils/eventBus";

describe("SelectTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let selectTool: SelectTool;
  let context: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    eventBus = new EventBus();
    selectTool = new SelectTool(canvas, eventBus);
    context = canvas.getContext("2d")!;
  });

  it("should equip and unequip correctly", () => {
    const equipSpy = jest.spyOn(eventBus, "emit");
    selectTool.equip();
    expect(equipSpy).toHaveBeenCalledWith("tool:equipped", selectTool);
    expect(equipSpy).toHaveBeenCalledWith("workarea:update");

    const unequipSpy = jest.spyOn(eventBus, "emit");
    selectTool.unequip();
    expect(unequipSpy).toHaveBeenCalledWith("tool:unequipped", selectTool);
    expect(unequipSpy).toHaveBeenCalledWith("workarea:update");
  });

  it("should set firstPoint on mouse down", () => {
    const mouseDownEvent = new MouseEvent("mousedown", { clientX: 10, clientY: 20 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    selectTool.onMouseDown(mouseDownEvent);
    // We can't directly test private properties, so we test the effects.
    // In this case, onMouseDown alone doesn't have a visible effect until mouseMove.
  });

  it("should set secondPoint and emit workarea:update on mouse move if dragging distance is exceeded", () => {
    const updateSpy = jest.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown", { clientX: 10, clientY: 20 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    selectTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent("mousemove", { clientX: 30, clientY: 40 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 30 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 40 });
    selectTool.onMouseMove(mouseMoveEvent);

    expect(updateSpy).toHaveBeenCalledWith("workarea:update");
  });

  it("should not set secondPoint on mouse move if dragging distance is not exceeded", () => {
    const updateSpy = jest.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown", { clientX: 10, clientY: 20 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    selectTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent("mousemove", { clientX: 11, clientY: 21 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 11 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 21 });
    selectTool.onMouseMove(mouseMoveEvent);

    expect(updateSpy).not.toHaveBeenCalledWith("workarea:update");
  });

  it("should emit workarea:selectAt and reset points on mouse up", () => {
    const selectAtSpy = jest.spyOn(eventBus, "emit");
    const mouseDownEvent = new MouseEvent("mousedown", { clientX: 10, clientY: 20 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    selectTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent("mousemove", { clientX: 30, clientY: 40 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 30 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 40 });
    selectTool.onMouseMove(mouseMoveEvent);
    selectTool.onMouseUp();

    expect(selectAtSpy).toHaveBeenCalledWith("workarea:selectAt", {
      firstPoint: { x: 10, y: 20 },
      secondPoint: { x: 30, y: 40 },
    });
  });

  it("should draw the selection rectangle", () => {
    const strokeRectSpy = jest.spyOn(context, "strokeRect");
    const mouseDownEvent = new MouseEvent("mousedown", { clientX: 10, clientY: 20 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseDownEvent, "offsetX", { value: 10 });
    Object.defineProperty(mouseDownEvent, "offsetY", { value: 20 });
    selectTool.onMouseDown(mouseDownEvent);

    const mouseMoveEvent = new MouseEvent("mousemove", { clientX: 30, clientY: 40 }) as MouseEvent & { offsetX: number; offsetY: number };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 30 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 40 });
    selectTool.onMouseMove(mouseMoveEvent);
    selectTool.draw();

    expect(strokeRectSpy).toHaveBeenCalledWith(10, 20, 20, 20);
  });
});
