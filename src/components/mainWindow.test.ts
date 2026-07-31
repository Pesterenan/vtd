/**
 * @vitest-environment jsdom
 */
import { TOOL } from "src/components/types";
import { EventBus } from "src/utils/eventBus";
import { PenTool } from "src/components/tools/penTool";
import { MainWindow } from "./mainWindow";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    onResized: vi.fn(),
    onFocusChanged: vi.fn(),
  })),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("MainWindow - PenTool integration", () => {
  let eventBus: EventBus;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus = new EventBus();
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
  });

  afterEach(() => {
    (MainWindow as unknown as { instance: null }).instance = null;
  });

  it("should have PenTool in the tools map under TOOL.PEN", () => {
    const instance = MainWindow.getInstance(eventBus, { canvas });
    const tools = (instance as unknown as { tools: Record<string, unknown> }).tools;

    expect(tools[TOOL.PEN]).toBeDefined();
    expect(tools[TOOL.PEN]).toBeInstanceOf(PenTool);
  });

  it("should emit tool:change with TOOL.PEN when KeyP is pressed", () => {
    vi.spyOn(eventBus, "emit");
    MainWindow.getInstance(eventBus, { canvas });
    vi.mocked(eventBus.emit).mockClear();

    window.dispatchEvent(new KeyboardEvent("keypress", { code: "KeyP" }));

    expect(eventBus.emit).toHaveBeenCalledWith("tool:change", TOOL.PEN);
  });

  it("should equip PenTool when tool:change is emitted with TOOL.PEN", () => {
    vi.spyOn(eventBus, "emit");
    MainWindow.getInstance(eventBus, { canvas });
    vi.mocked(eventBus.emit).mockClear();

    eventBus.emit("tool:change", TOOL.PEN);

    expect(eventBus.emit).toHaveBeenCalledWith("tool:equipped", expect.any(PenTool));
  });
});
