import { PenTool } from "./penTool";
import { EventBus } from "../../utils/eventBus";

describe("PenTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let penTool: PenTool;

  beforeEach(() => {
    vi.clearAllMocks();
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    eventBus = new EventBus();
    penTool = new PenTool(canvas, eventBus);
    vi.spyOn(eventBus, "emit");
    // Mock adjustForCanvas para retornar Position (objeto {x, y})
    vi.spyOn(eventBus, "request").mockImplementation((event, payload) => {
      if (event === "workarea:adjustForCanvas") {
        return [{ x: payload?.position.x || 0, y: payload?.position.y || 0 }];
      }
      return [];
    });
  });

  it("should emit tool:equipped and set cursor to crosshair", () => {
    penTool.equip();
    expect(eventBus.emit).toHaveBeenCalledWith("tool:equipped", penTool);
    expect(canvas.style.cursor).toBe("crosshair");
  });

  it("should emit tool:unequipped and reset cursor", () => {
    penTool.unequip();
    expect(eventBus.emit).toHaveBeenCalledWith("tool:unequipped", penTool);
    expect(canvas.style.cursor).toBe("");
  });

  it("onMouseDown in IDLE state should start path and transition to DRAWING", () => {
    const evt = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt, "offsetX", { value: 100 });
    Object.defineProperty(evt, "offsetY", { value: 200 });

    penTool.onMouseDown(evt);

    expect(penTool.state).toBe("DRAWING");
  });

  it("onMouseDown in DRAWING state should add point to screenPoints", () => {
    const evt1 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt1, "offsetX", { value: 100 });
    Object.defineProperty(evt1, "offsetY", { value: 200 });

    penTool.onMouseDown(evt1);

    const evt2 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt2, "offsetX", { value: 300 });
    Object.defineProperty(evt2, "offsetY", { value: 400 });

    penTool.onMouseDown(evt2);

    expect(penTool.state).toBe("DRAWING");
  });

  it("should auto-close path when click is within 8px of first point", () => {
    // First click at (100, 200)
    const evt1 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt1, "offsetX", { value: 100 });
    Object.defineProperty(evt1, "offsetY", { value: 200 });
    penTool.onMouseDown(evt1);

    // Second click far away (>8px from first point)
    const evt2 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt2, "offsetX", { value: 500 });
    Object.defineProperty(evt2, "offsetY", { value: 600 });
    penTool.onMouseDown(evt2);

    // Third click within 8px of first point → should auto-close
    const evt3 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt3, "offsetX", { value: 104 });
    Object.defineProperty(evt3, "offsetY", { value: 204 });
    penTool.onMouseDown(evt3);

    expect(eventBus.emit).toHaveBeenCalledWith("edit:path", {
      position: expect.anything(),
      points: expect.any(Array),
      isClosed: true,
    });
  });

  it("should finalize path as open when Enter is pressed with >= 2 points", () => {
    const evt1 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt1, "offsetX", { value: 100 });
    Object.defineProperty(evt1, "offsetY", { value: 200 });

    penTool.onMouseDown(evt1);

    // Segundo ponto muito distante (>8px) para evitar fechamento automático
    const evt2 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt2, "offsetX", { value: 500 });
    Object.defineProperty(evt2, "offsetY", { value: 600 });

    penTool.onMouseDown(evt2);

    // Enter finaliza o caminho como aberto (isClosed=false)
    const keydownEvent = new KeyboardEvent("keydown", { code: "Enter" });
    penTool.onKeyDown(keydownEvent);

    expect(eventBus.emit).toHaveBeenCalledWith("edit:path", {
      position: expect.anything(),
      points: expect.any(Array),
      isClosed: false,
    });
  });

  it("should discard path when Escape is pressed", () => {
    const evt1 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt1, "offsetX", { value: 100 });
    Object.defineProperty(evt1, "offsetY", { value: 200 });

    penTool.onMouseDown(evt1);

    const evt2 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt2, "offsetX", { value: 300 });
    Object.defineProperty(evt2, "offsetY", { value: 400 });

    penTool.onMouseDown(evt2);

    // Escape descarta o caminho e volta a IDLE
    const keydownEvent = new KeyboardEvent("keydown", { code: "Escape" });
    penTool.onKeyDown(keydownEvent);

    expect(penTool.state).toBe("IDLE");
  });

  it("Backspace should remove last point and return to IDLE when empty", () => {
    const evt1 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt1, "offsetX", { value: 100 });
    Object.defineProperty(evt1, "offsetY", { value: 200 });

    penTool.onMouseDown(evt1);

    // Backspace remove o último ponto e volta a IDLE quando vazio
    const keydownEvent = new KeyboardEvent("keydown", { code: "Backspace" });
    penTool.onKeyDown(keydownEvent);

    expect(penTool.state).toBe("IDLE");
  });

  it("unequip during DRAWING should finalize path as open if >= 2 points", () => {
    const evt1 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt1, "offsetX", { value: 100 });
    Object.defineProperty(evt1, "offsetY", { value: 200 });

    penTool.onMouseDown(evt1);

    // Segundo ponto muito distante (>8px) para evitar fechamento automático
    const evt2 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt2, "offsetX", { value: 500 });
    Object.defineProperty(evt2, "offsetY", { value: 600 });

    penTool.onMouseDown(evt2);

    const unequipSpy = vi.spyOn(penTool, "unequip");
    penTool.unequip();

    expect(unequipSpy).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith("edit:path", {
      position: expect.anything(),
      points: expect.any(Array),
      isClosed: false,
    });
  });

  it("draw() should call canvas context methods for path preview", () => {
    // Setup: add points with distance >8px to avoid auto-close
    const evt1 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt1, "offsetX", { value: 100 });
    Object.defineProperty(evt1, "offsetY", { value: 200 });

    penTool.onMouseDown(evt1);

    const evt2 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt2, "offsetX", { value: 500 });
    Object.defineProperty(evt2, "offsetY", { value: 600 });

    penTool.onMouseDown(evt2);

    // Set cursor position (simulating mouse move)
    const mouseMoveEvent = new MouseEvent("mousemove") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 800 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 900 });

    penTool.onMouseMove(mouseMoveEvent);

    // Spy on the real canvas context methods
    const context = canvas.getContext("2d")!;
    const beginPathSpy = vi.spyOn(context, "beginPath");
    const lineToSpy = vi.spyOn(context, "lineTo");
    const arcSpy = vi.spyOn(context, "arc");
    const strokeSpy = vi.spyOn(context, "stroke");

    penTool.draw();

    expect(beginPathSpy).toHaveBeenCalled();
    expect(lineToSpy).toHaveBeenCalled(); // Called for each point and cursor
    expect(arcSpy).toHaveBeenCalledTimes(2); // One per point
    expect(strokeSpy).toHaveBeenCalled();
  });

  it("should handle right-click by ignoring in onMouseDown", () => {
    const evt = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: false,
      button: 2, // right-click
    }) as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt, "offsetX", { value: 100 });
    Object.defineProperty(evt, "offsetY", { value: 200 });

    penTool.onMouseDown(evt);

    expect(penTool.state).toBe("IDLE");
    // Right-click should not add any points or emit events
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("onMouseMove should update cursor position and emit workarea:update in DRAWING state", () => {
    const evt1 = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt1, "offsetX", { value: 100 });
    Object.defineProperty(evt1, "offsetY", { value: 200 });

    penTool.onMouseDown(evt1);

    const mouseMoveEvent = new MouseEvent("mousemove") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(mouseMoveEvent, "offsetX", { value: 300 });
    Object.defineProperty(mouseMoveEvent, "offsetY", { value: 400 });

    penTool.onMouseMove(mouseMoveEvent);

    // workarea:update is emitted without payload
  });

  it("should not finalize path when unequip with only 1 point", () => {
    const evt = new MouseEvent("mousedown") as MouseEvent & {
      offsetX: number;
      offsetY: number;
    };
    Object.defineProperty(evt, "offsetX", { value: 100 });
    Object.defineProperty(evt, "offsetY", { value: 200 });

    penTool.onMouseDown(evt);

    const unequipSpy = vi.spyOn(penTool, "unequip");
    penTool.unequip();

    expect(unequipSpy).toHaveBeenCalled();
    // Should not emit edit:path since only 1 point (discardPath is called instead)
    expect(eventBus.emit).not.toHaveBeenCalledWith("edit:path", expect.any(Object));
  });
});
