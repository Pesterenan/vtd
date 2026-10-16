import { ShapeTool } from "./shapeTool";
import { EventBus } from "../../utils/eventBus";
import type { Position } from "../types";

type MouseEventWithOffset = MouseEvent & {
  offsetX: number;
  offsetY: number;
};

type ToolState = {
  currentMode?: unknown;
  sides?: unknown;
  startPoint?: unknown;
  currentPoint?: unknown;
  isDragging?: unknown;
};

type EmitCalls = Array<[string, unknown]>;

type ContextMenuItem = {
  id: string;
  action: () => void;
};

type ShapeBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type ShapePayload = {
  mode: string;
  box: ShapeBox;
  sides: number;
};

function createMouseEvent(
  offsetX: number,
  offsetY: number,
  init: MouseEventInit = {},
): MouseEventWithOffset {
  const evt = new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: false,
    ...init,
  }) as MouseEventWithOffset;
  Object.defineProperty(evt, "offsetX", { value: offsetX });
  Object.defineProperty(evt, "offsetY", { value: offsetY });
  return evt;
}

function createContextMenuEvent(clientX: number, clientY: number): MouseEvent {
  return new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  });
}

describe("ShapeTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let shapeTool: ShapeTool;
  let currentMouse: Position | null;

  function configureRequest(): void {
    vi.mocked(eventBus.request).mockImplementation((event, payload) => {
      const pos = (payload as { position?: Position })?.position;
      if (event === "mouse:position:get") {
        return currentMouse ? [currentMouse] : [];
      }
      if (
        event === "workarea:adjustForCanvas" ||
        event === "workarea:adjustForScreen"
      ) {
        if (pos === undefined) return [];
        return [pos];
      }
      if (event === "workarea:offset:get") return [{ x: 0, y: 0 }];
      if (event === "zoomLevel:get") return [1];
      if (event === "workarea:selected:get") return [[]];
      return [];
    });
  }

  function setMouse(pos: Position): void {
    currentMouse = pos;
  }

  function emitCalls(): EmitCalls {
    const spy = eventBus.emit as unknown as { mock: { calls: EmitCalls } };
    return spy.mock.calls;
  }

  function findEmit(event: string): unknown[] {
    return emitCalls()
      .filter(([name]) => name === event)
      .map(([, payload]) => payload);
  }

  function state(): ToolState {
    return shapeTool as unknown as ToolState;
  }

  /** Troca o modo via a ação do context-menu (único caminho suportado). */
  function switchModeViaMenu(modeId: string): void {
    shapeTool.onContextMenu(createContextMenuEvent(50, 60));
    const opened = findEmit("workarea:contextMenu:open") as Array<{
      items: ContextMenuItem[];
    }>;
    const item = opened[0].items.find((entry) => entry.id === modeId);
    expect(item).toBeDefined();
    item?.action();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    currentMouse = null;
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    eventBus = new EventBus();
    shapeTool = new ShapeTool(canvas, eventBus);
    vi.spyOn(eventBus, "emit");
    vi.spyOn(eventBus, "request");
    configureRequest();
    shapeTool.equip();
    vi.mocked(eventBus.emit).mockClear();
  });

  it("usa rectangle como modo inicial e 5 lados como default", () => {
    expect(state().currentMode).toBe("rectangle");
    expect(state().sides).toBe(5);
  });

  it("draw() nao lanca erro sem estado de drag", () => {
    expect(() => shapeTool.draw()).not.toThrow();
  });

  it("abre o menu de modos mesmo sem selecao com os 5 modos", () => {
    shapeTool.onContextMenu(createContextMenuEvent(50, 60));

    const opened = findEmit("workarea:contextMenu:open") as Array<{
      position: Position;
      items: ContextMenuItem[];
    }>;
    expect(opened).toHaveLength(1);
    expect(opened[0].position).toEqual({ x: 50, y: 60 });
    const ids = opened[0].items.map((item) => item.id);
    expect(ids).toEqual(["rectangle", "ellipse", "triangle", "polygon", "star"]);
  });

  it("troca de modo acontece somente via acao do context-menu", () => {
    switchModeViaMenu("polygon");

    expect(state().currentMode).toBe("polygon");
  });

  it("drag canto-a-canto emite edit:shape com bbox e sides", () => {
    setMouse({ x: 10, y: 20 });
    shapeTool.onMouseDown(createMouseEvent(10, 20));

    setMouse({ x: 110, y: 120 });
    shapeTool.onMouseMove(createMouseEvent(110, 120));
    shapeTool.onMouseUp(createMouseEvent(110, 120));

    const payloads = findEmit("edit:shape") as ShapePayload[];
    expect(payloads).toHaveLength(1);
    expect(payloads[0].mode).toBe("rectangle");
    expect(payloads[0].box).toEqual({ x: 10, y: 20, w: 100, h: 100 });
    expect(payloads[0].sides).toBe(5);
  });

  it("Shift trava a proporcao em 1:1 usando o maior lado", () => {
    shapeTool.onKeyDown(
      new KeyboardEvent("keydown", { key: "Shift", shiftKey: true }),
    );
    setMouse({ x: 10, y: 10 });
    shapeTool.onMouseDown(createMouseEvent(10, 10));

    setMouse({ x: 110, y: 60 });
    shapeTool.onMouseMove(createMouseEvent(110, 60));
    shapeTool.onMouseUp(createMouseEvent(110, 60));

    const payloads = findEmit("edit:shape") as ShapePayload[];
    expect(payloads).toHaveLength(1);
    expect(payloads[0].box.w).toBe(payloads[0].box.h);
    expect(payloads[0].box.w).toBe(100);
  });

  it("Alt desenha a partir do centro", () => {
    shapeTool.onKeyDown(new KeyboardEvent("keydown", { key: "Alt", altKey: true }));
    setMouse({ x: 100, y: 100 });
    shapeTool.onMouseDown(createMouseEvent(100, 100));

    setMouse({ x: 150, y: 120 });
    shapeTool.onMouseMove(createMouseEvent(150, 120));
    shapeTool.onMouseUp(createMouseEvent(150, 120));

    const payloads = findEmit("edit:shape") as ShapePayload[];
    expect(payloads).toHaveLength(1);
    expect(payloads[0].box).toEqual({ x: 50, y: 80, w: 100, h: 40 });
  });

  it("wheel em polygon ajusta os lados com clamp 5-12", () => {
    switchModeViaMenu("polygon");
    expect(state().sides).toBe(5);

    function wheel(deltaY: number): void {
      const wheelEvt = new Event("wheel", {
        bubbles: true,
      }) as Event & { deltaY: number };
      Object.defineProperty(wheelEvt, "deltaY", { value: deltaY });
      shapeTool.onWheel(wheelEvt as WheelEvent);
    }

    wheel(-100);
    expect(state().sides).toBe(6);

    wheel(100);
    expect(state().sides).toBe(5);

    for (let i = 0; i < 20; i += 1) wheel(100);
    expect(state().sides).toBe(5);

    for (let i = 0; i < 20; i += 1) wheel(-100);
    expect(state().sides).toBe(12);
  });

  it("wheel em star ajusta as pontas com clamp 4-8", () => {
    switchModeViaMenu("star");
    expect(state().sides).toBe(5);

    function wheel(deltaY: number): void {
      const wheelEvt = new Event("wheel", {
        bubbles: true,
      }) as Event & { deltaY: number };
      Object.defineProperty(wheelEvt, "deltaY", { value: deltaY });
      shapeTool.onWheel(wheelEvt as WheelEvent);
    }

    for (let i = 0; i < 20; i += 1) wheel(100);
    expect(state().sides).toBe(4);

    for (let i = 0; i < 20; i += 1) wheel(-100);
    expect(state().sides).toBe(8);
  });

  it("troca polygon -> star limita os lados para o intervalo da estrela", () => {
    switchModeViaMenu("polygon");
    const withSides = shapeTool as unknown as { sides: number };
    withSides.sides = 12;

    switchModeViaMenu("star");

    expect(state().sides).toBe(8);
  });

  it("wheel fora de polygon/star nao altera os lados", () => {
    function wheel(deltaY: number): void {
      const wheelEvt = new Event("wheel", {
        bubbles: true,
      }) as Event & { deltaY: number };
      Object.defineProperty(wheelEvt, "deltaY", { value: deltaY });
      shapeTool.onWheel(wheelEvt as WheelEvent);
    }

    wheel(-100);
    wheel(100);

    expect(state().sides).toBe(5);
  });

  it("Escape no meio do drag cancela sem emitir edit:shape", () => {
    setMouse({ x: 10, y: 10 });
    shapeTool.onMouseDown(createMouseEvent(10, 10));
    setMouse({ x: 100, y: 100 });
    shapeTool.onMouseMove(createMouseEvent(100, 100));

    shapeTool.onKeyDown(new KeyboardEvent("keydown", { key: "Escape" }));
    shapeTool.onMouseUp(createMouseEvent(100, 100));

    expect(state().startPoint).toBeNull();
    expect(state().currentPoint).toBeNull();
    expect(state().isDragging).toBe(false);
    expect(findEmit("edit:shape")).toHaveLength(0);
  });

  it("drag minimo abaixo do limiar descarta a forma e reseta o estado", () => {
    setMouse({ x: 10, y: 10 });
    shapeTool.onMouseDown(createMouseEvent(10, 10));

    setMouse({ x: 12, y: 11 });
    shapeTool.onMouseMove(createMouseEvent(12, 11));
    shapeTool.onMouseUp(createMouseEvent(12, 11));

    expect(findEmit("edit:shape")).toHaveLength(0);
    expect(state().isDragging).toBe(false);
  });
});
