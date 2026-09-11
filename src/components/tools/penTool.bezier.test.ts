/**
 * @vitest-environment jsdom
 * PenTool bezier: Ctrl move, drag smooth, Alt independente, hitHandleOrPoint.
 */
import { PenTool } from "./penTool";
import { EventBus } from "../../utils/eventBus";
import { PathElement } from "../elements/pathElement";
import type { Position } from "../types";

type MouseEventWithOffset = MouseEvent & { offsetX: number; offsetY: number };

function createMouseEvent(offsetX: number, offsetY: number, init: MouseEventInit = {}): MouseEventWithOffset {
  const evt = new MouseEvent("mousedown", { bubbles: true, cancelable: false, ...init }) as MouseEventWithOffset;
  Object.defineProperty(evt, "offsetX", { value: offsetX });
  Object.defineProperty(evt, "offsetY", { value: offsetY });
  return evt;
}

describe("PenTool - Bezier", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let penTool: PenTool;
  let currentMouse: Position | null;

  function configureRequest(overrides?: {
    selected?: unknown[] | null;
    elements?: unknown[];
    zoom?: number;
    offset?: Position;
    adjust?: (pos: Position) => Position;
  }): void {
    const selected = overrides?.selected !== undefined ? overrides.selected : null;
    const elements = overrides?.elements ?? [];
    const zoom = overrides?.zoom ?? 1;
    const offset = overrides?.offset ?? { x: 0, y: 0 };
    const adjust = overrides?.adjust ?? ((pos: Position) => pos);
    vi.mocked(eventBus.request).mockImplementation((event, payload) => {
      const pos = (payload as { position?: Position })?.position;
      if (event === "workarea:selected:get") return selected === null ? [[]] : [selected];
      if (event === "workarea:elements:get") return [elements];
      if (event === "workarea:offset:get") return [offset];
      if (event === "zoomLevel:get") return [zoom];
      if (event === "mouse:position:get") return currentMouse ? [currentMouse] : [];
      if (event === "workarea:adjustForCanvas" || event === "workarea:adjustForScreen") {
        if (pos === undefined) return [];
        return [adjust(pos)];
      }
      return [];
    });
  }

  function setMouse(pos: Position): void { currentMouse = pos; }

  function makePath(): PathElement {
    const p = new PathElement({ x: 100, y: 100 }, { width: 10, height: 10 }, 1);
    p.points = [
      { center: { x: 0, y: 0 }, in: null, out: null },
      { center: { x: 50, y: 0 }, in: null, out: null },
      { center: { x: 50, y: 50 }, in: null, out: null },
    ];
    return p;
  }

  function activatePath(p: PathElement): void {
    configureRequest({ selected: [p] });
    eventBus.emit("workarea:selectById", { elementsId: new Set([p.elementId]) });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    currentMouse = null;
    canvas = document.createElement("canvas");
    canvas.width = 800; canvas.height = 600;
    eventBus = new EventBus();
    penTool = new PenTool(canvas, eventBus);
    vi.spyOn(eventBus, "emit");
    vi.spyOn(eventBus, "request");
    configureRequest();
    penTool.equip();
  });

  describe("drag sem modificador cria handles smooth (simétrico)", () => {
    it("arrastar anchor sem Ctrl/Alt deve transformar corner em smooth com handles opostos", () => {
      const p = makePath();
      activatePath(p);
      // segundo ponto em world 150,100 (position 100,100 + local 50,0)
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      setMouse({ x: 170, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      setMouse({ x: 180, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));

      const pt = p.points[1];
      expect(pt.in).not.toBeNull();
      expect(pt.out).not.toBeNull();
      const anchor = pt.center;
      expect(pt.out!.x + pt.in!.x).toBeCloseTo(anchor.x * 2, 0);
      expect(pt.out!.y + pt.in!.y).toBeCloseTo(anchor.y * 2, 0);
    });

    it("threshold POINT_DRAG_DISTANCE não deve criar handles antes do limite", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      setMouse({ x: 152, y: 100 }); // 2px < 5
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      const pt = p.points[1];
      expect(pt.in).toBeNull();
      expect(pt.out).toBeNull();
    });

    it("drag de handle já existente sem modificador deve espelhar oposto (smooth)", () => {
      const p = makePath();
      p.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 0, y: 0 }, in: { x: -10, y: 0 }, out: { x: 10, y: 0 } },
        { center: { x: 50, y: 50 }, in: null, out: null },
      ];
      activatePath(p);
      const anchorWorld = { x: 100, y: 100 };
      setMouse({ x: anchorWorld.x + 10, y: anchorWorld.y });
      penTool.onMouseDown(createMouseEvent(0, 0));
      setMouse({ x: anchorWorld.x + 20, y: anchorWorld.y });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      const pt = p.points[1];
      expect(pt.in!.x + pt.out!.x).toBeCloseTo(pt.center.x * 2, 0);
    });
  });

  describe("Alt+drag handle independente", () => {
    it("Alt+drag em out deve mover só out, in permanece (em mundo)", () => {
      const p = makePath();
      p.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 50, y: 0 }, in: { x: 40, y: 0 }, out: { x: 60, y: 0 } },
      ];
      activatePath(p);
      const inWorldBefore = p.toWorldPos(p.points[1].in!);
      const outLocalBefore = { ...p.points[1].out! };
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Alt", altKey: true }));
      // out do ponto 1 em world: 100+60,100+0 = 160,100
      setMouse({ x: 160, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      setMouse({ x: 180, y: 115 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      penTool.onKeyUp(new KeyboardEvent("keyup", { key: "Alt" }));

      const pt = p.points[1];
      // in preservado em MUNDO (recomputeBounds pode rebasear o local)
      expect(p.toWorldPos(pt.in!)).toEqual(inWorldBefore);
      expect(pt.out).not.toEqual(outLocalBefore);
    });
  });

  describe("Ctrl+drag move anchor preservando handles relativos", () => {
    it("Ctrl+drag no anchor move center e translada handles", () => {
      const p = makePath();
      p.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 50, y: 0 }, in: { x: 40, y: 0 }, out: { x: 60, y: 0 } },
      ];
      activatePath(p);
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Control", ctrlKey: true }));
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      setMouse({ x: 170, y: 120 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      penTool.onKeyUp(new KeyboardEvent("keyup", { key: "Control" }));

      const pt = p.points[1];
      const handleOutWorld = p.toWorldPos(pt.out!);
      const anchorWorld = p.toWorld(pt).center;
      expect(handleOutWorld.x).toBeCloseTo(anchorWorld.x + 10, 0);
      const handleInWorld = p.toWorldPos(pt.in!);
      expect(handleInWorld.x + handleOutWorld.x).toBeCloseTo(anchorWorld.x * 2, 0);
    });

    it("Ctrl+drag em handle deve mover handle", () => {
      const p = makePath();
      p.points = [
        { center: { x: 0, y: 0 }, in: { x: -10, y: 0 }, out: { x: 10, y: 0 } },
      ];
      activatePath(p);
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Control", ctrlKey: true }));
      setMouse({ x: 110, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      setMouse({ x: 130, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      const pt = p.points[0];
      expect(pt.out).not.toEqual({ x: 10, y: 0 });
    });
  });

  describe("hitHandleOrPoint", () => {
    it("detecta out próximo ao mouse", () => {
      const p = makePath();
      p.points = [
        { center: { x: 0, y: 0 }, in: null, out: { x: 20, y: 0 } },
        { center: { x: 50, y: 0 }, in: null, out: null },
      ];
      activatePath(p);
      setMouse({ x: 120, y: 100 });
      const hit = (penTool as unknown as { hitHandleOrPoint: (m: Position) => { index: number; which: string } | null }).hitHandleOrPoint({ x: 120, y: 100 });
      expect(hit).not.toBeNull();
      expect(hit!.which).toBe("out");
      expect(hit!.index).toBe(0);
    });

    it("detecta center quando longe dos handles", () => {
      const p = makePath();
      activatePath(p);
      const hit = (penTool as unknown as { hitHandleOrPoint: (m: Position) => { index: number; which: string } | null }).hitHandleOrPoint({ x: 150, y: 100 });
      expect(hit).not.toBeNull();
      expect(hit!.which).toBe("center");
      expect(hit!.index).toBe(1);
    });

    it("Alt+click não remove ponto (remoção via Delete)", () => {
      const p = makePath();
      activatePath(p);
      const before = p.points.length;
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Alt", altKey: true }));
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      penTool.onKeyUp(new KeyboardEvent("keyup", { key: "Alt" }));
      expect(p.points).toHaveLength(before);
    });
  });

  describe("overlay", () => {
    it("draw deve renderizar handles (linha anchor-handle)", () => {
      const p = makePath();
      p.points = [{ center: { x: 0, y: 0 }, in: null, out: { x: 10, y: 0 } }];
      activatePath(p);
      setMouse({ x: 200, y: 200 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      const ctx = canvas.getContext("2d")!;
      const strokeSpy = vi.spyOn(ctx, "stroke");
      const lineToSpy = vi.spyOn(ctx, "lineTo");
      penTool.draw();
      expect(strokeSpy).toHaveBeenCalled();
      expect(lineToSpy).toHaveBeenCalled();
    });

    it("gesto smooth cria handles persistentes após mouseUp", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      setMouse({ x: 170, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      setMouse({ x: 180, y: 110 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      expect(p.points[1].out).not.toBeNull();
    });
  });

  describe("inserção Shift+click na curva bezier", () => {
    it("insere o ponto sobre a barriga da curva, não sobre a corda", () => {
      const p = makePath();
      // Curva com barriga em local (50,75) -> mundo/tela (150,175);
      // a corda entre os centros passa por (150,100), 75px abaixo.
      p.points = [
        { center: { x: 0, y: 0 }, in: null, out: { x: 0, y: 100 } },
        { center: { x: 100, y: 0 }, in: { x: 100, y: 100 }, out: null },
      ];
      activatePath(p);
      penTool.onKeyDown(
        new KeyboardEvent("keydown", { key: "Shift", shiftKey: true }),
      );
      setMouse({ x: 150, y: 175 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(3);
      const insertedWorld = p.toWorld(p.points[1]).center;
      // Cai sobre a curva (perto do mouse)...
      expect(Math.hypot(insertedWorld.x - 150, insertedWorld.y - 175)).toBeLessThan(5);
      // ...e longe da corda reta entre os centros.
      expect(Math.hypot(insertedWorld.x - 150, insertedWorld.y - 100)).toBeGreaterThan(30);
    });
  });

  describe("drag de handle começa no primeiro clique", () => {
    function makeHandledPath(): PathElement {
      const p = makePath();
      p.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 50, y: 0 }, in: { x: 40, y: 0 }, out: { x: 60, y: 0 } },
      ];
      return p;
    }

    it("mover 2px (abaixo do limiar) já move o handle agarrado", () => {
      const p = makeHandledPath();
      activatePath(p);
      // out do ponto 1 em tela = (160,100)
      setMouse({ x: 160, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      const outBefore = { ...p.points[1].out! };
      setMouse({ x: 162, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      expect(p.points[1].out).not.toEqual(outBefore);
    });

    it("só clicar no handle (sem mover) seleciona sem remodelar", () => {
      const p = makeHandledPath();
      activatePath(p);
      const outBefore = { ...p.points[1].out! };
      setMouse({ x: 160, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      expect(penTool["selectedPointIndex"]).toBe(1);
      expect(p.points[1].out).toEqual(outBefore);
    });
  });

  describe("Alt reverte smooth -> corner", () => {
    function makeSmoothPath(): PathElement {
      const p = makePath();
      p.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 50, y: 0 }, in: { x: 40, y: 0 }, out: { x: 60, y: 0 } },
      ];
      return p;
    }

    it("Alt+click (sem arrastar) no anchor smooth remove os handles", () => {
      const p = makeSmoothPath();
      activatePath(p);
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Alt", altKey: true }));
      const centerBefore = p.toWorld(p.points[1]).center;
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      penTool.onKeyUp(new KeyboardEvent("keyup", { key: "Alt" }));

      expect(p.points[1].in).toBeNull();
      expect(p.points[1].out).toBeNull();
      // O anchor não sai do lugar e continua selecionado.
      expect(p.toWorld(p.points[1]).center).toEqual(centerBefore);
      expect(penTool["selectedPointIndex"]).toBe(1);
    });

    it("click sem Alt preserva os handles (só seleciona)", () => {
      const p = makeSmoothPath();
      activatePath(p);
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      expect(p.points[1].in).not.toBeNull();
      expect(p.points[1].out).not.toBeNull();
    });

    it("Alt+drag no anchor smooth vira corner e move o ponto", () => {
      const p = makeSmoothPath();
      activatePath(p);
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Alt", altKey: true }));
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      setMouse({ x: 170, y: 120 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      penTool.onKeyUp(new KeyboardEvent("keyup", { key: "Alt" }));

      expect(p.points[1].in).toBeNull();
      expect(p.points[1].out).toBeNull();
      const c = p.toWorld(p.points[1]).center;
      expect(Math.hypot(c.x - 170, c.y - 120)).toBeLessThan(5);
    });
  });
});
