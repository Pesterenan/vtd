
import { EventBus } from "../../utils/eventBus";
import { Tool } from "./abstractTool";
import { ToolManager } from "./toolManager";

class MockTool extends Tool {
  equip = jest.fn();
  unequip = jest.fn();
  onMouseDown = jest.fn();
  onMouseMove = jest.fn();
  onMouseUp = jest.fn();
  onKeyDown = jest.fn();
  onKeyUp = jest.fn();
  draw = jest.fn();
}

describe("ToolManager", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let toolManager: ToolManager;
  let mockTool: MockTool;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    eventBus = new EventBus();
    toolManager = new ToolManager(canvas, eventBus);
    mockTool = new MockTool(canvas, eventBus);
  });

  it("should equip the first tool used", () => {
    toolManager.use(mockTool);
    expect(mockTool.equip).toHaveBeenCalled();
  });

  it("should unequip the current tool when a new one is used", () => {
    const anotherMockTool = new MockTool(canvas, eventBus);
    toolManager.use(mockTool);
    toolManager.use(anotherMockTool);
    expect(mockTool.unequip).toHaveBeenCalled();
    expect(anotherMockTool.equip).toHaveBeenCalled();
  });

  it("should delegate mouse down events", () => {
    toolManager.use(mockTool);
    const event = new MouseEvent("mousedown");
    canvas.dispatchEvent(event);
    expect(mockTool.onMouseDown).toHaveBeenCalledWith(event);
  });

  it("should delegate mouse move events", () => {
    toolManager.use(mockTool);
    const event = new MouseEvent("mousemove");
    canvas.dispatchEvent(event);
    expect(mockTool.onMouseMove).toHaveBeenCalledWith(event);
  });

  it("should delegate mouse up events", () => {
    toolManager.use(mockTool);
    const event = new MouseEvent("mouseup");
    canvas.dispatchEvent(event);
    expect(mockTool.onMouseUp).toHaveBeenCalledWith(event);
  });

  it("should delegate key down events", () => {
    toolManager.use(mockTool);
    const event = new KeyboardEvent("keydown");
    window.dispatchEvent(event);
    expect(mockTool.onKeyDown).toHaveBeenCalledWith(event);
  });

  it("should delegate key up events", () => {
    toolManager.use(mockTool);
    const event = new KeyboardEvent("keyup");
    window.dispatchEvent(event);
    expect(mockTool.onKeyUp).toHaveBeenCalledWith(event);
  });

  it("should call draw on the current tool", () => {
    toolManager.use(mockTool);
    toolManager.draw();
    expect(mockTool.draw).toHaveBeenCalled();
  });
});
