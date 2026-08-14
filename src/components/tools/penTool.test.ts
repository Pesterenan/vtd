import { PenTool } from "./penTool";
import { EventBus } from "../../utils/eventBus";
import { PathElement } from "../elements/pathElement";
import type { Position } from "../types";

type MouseEventWithOffset = MouseEvent & {
  offsetX: number;
  offsetY: number;
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

describe("PenTool", () => {
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
    const selected =
      overrides?.selected !== undefined ? overrides.selected : null;
    const elements = overrides?.elements ?? [];
    const zoom = overrides?.zoom ?? 1;
    const offset = overrides?.offset ?? { x: 0, y: 0 };
    const adjust = overrides?.adjust ?? ((pos: Position) => pos);
    vi.mocked(eventBus.request).mockImplementation((event, payload) => {
      const pos = (payload as { position?: Position })?.position;
      if (event === "workarea:selected:get") {
        return selected === null ? [[]] : [selected];
      }
      if (event === "workarea:elements:get") return [elements];
      if (event === "workarea:offset:get") return [offset];
      if (event === "zoomLevel:get") return [zoom];
      if (event === "mouse:position:get") {
        return currentMouse ? [currentMouse] : [];
      }
      if (
        event === "workarea:adjustForCanvas" ||
        event === "workarea:adjustForScreen"
      ) {
        if (pos === undefined) return [];
        return [adjust(pos)];
      }
      return [];
    });
  }

  function setMouse(pos: Position): void {
    currentMouse = pos;
  }

  function makePath(): PathElement {
    const p = new PathElement(
      { x: 100, y: 100 },
      { width: 10, height: 10 },
      1,
    );
    p.points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
    ];
    return p;
  }

  /** Simula a seleção de um PathElement que ativa a edição na pen tool. */
  function activatePath(p: PathElement): void {
    configureRequest({ selected: [p] });
    eventBus.emit("workarea:selectById", {
      elementsId: new Set([p.elementId]),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    currentMouse = null;
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    eventBus = new EventBus();
    penTool = new PenTool(canvas, eventBus);
    vi.spyOn(eventBus, "emit");
    vi.spyOn(eventBus, "request");
    configureRequest();
    penTool.equip();
  });

  describe("equip e unequip", () => {
    it("equip emite tool:equipped e esconde o cursor", () => {
      penTool.equip();

      expect(eventBus.emit).toHaveBeenCalledWith("tool:equipped", penTool);
      expect(canvas.style.cursor).toBe("none");
    });

    it("unequip emite tool:unequipped, limpa o cursor e reseta o estado", () => {
      const p = makePath();
      activatePath(p);
      expect(penTool["activePathElement"]).toBe(p);

      penTool.unequip();

      expect(eventBus.emit).toHaveBeenCalledWith("tool:unequipped", penTool);
      expect(canvas.style.cursor).toBe("");
      expect(penTool["activePathElement"]).toBeNull();
      expect(penTool["points"]).toEqual([]);
      expect(penTool["isClosing"]).toBe(false);
    });
  });

  describe("criação de um novo path", () => {
    it("clique sem path ativo emite edit:path com a posição do canvas", () => {
      penTool.onMouseDown(createMouseEvent(100, 200));

      expect(eventBus.emit).toHaveBeenCalledWith("edit:path", {
        position: { x: 100, y: 200 },
      });
    });

    it("com um path ativo o clique adiciona ponto em vez de emitir edit:path", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 200, y: 150 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(eventBus.emit).not.toHaveBeenCalledWith("edit:path", expect.anything());
      expect(p.points).toHaveLength(4);
    });

    it("adiciona pontos recentralizando o path e preservando a geometria", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 200, y: 150 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(4);
      expect(p.position).toEqual({ x: 150, y: 125 });
      expect(p.toWorld(p.points[0])).toEqual({ x: 100, y: 100 });
      expect(p.toWorld(p.points[3])).toEqual({ x: 200, y: 150 });
    });
  });

  describe("seleção do path ativo", () => {
    it("workarea:selectById com um PathElement ativa a edição e o overlay", () => {
      const p = makePath();
      activatePath(p);

      expect(penTool["activePathElement"]).toBe(p);
      expect(penTool["points"]).toEqual(p.points);
      expect(penTool["selectedPointIndex"]).toBe(p.points.length - 1);
    });

    it("workarea:selectAt também ativa o path selecionado", () => {
      const p = makePath();
      configureRequest({ selected: [p] });
      eventBus.emit("workarea:selectAt", { firstPoint: { x: 100, y: 100 } });

      expect(penTool["activePathElement"]).toBe(p);
    });

    it("seleção sem PathElement reseta o estado da ferramenta", () => {
      const p = makePath();
      activatePath(p);
      expect(penTool["activePathElement"]).toBe(p);

      configureRequest({ selected: [{ type: "image" }] });
      eventBus.emit("workarea:selectById", { elementsId: new Set([99]) });

      expect(penTool["activePathElement"]).toBeNull();
      expect(penTool["points"]).toEqual([]);
    });
  });

  describe("fechamento do path", () => {
    it("hover perto do primeiro ponto marca isClosing", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 103, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));

      expect(penTool["isClosing"]).toBe(true);
    });

    it("hover longe do primeiro ponto desmarca isClosing", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 300, y: 300 });
      penTool.onMouseMove(createMouseEvent(0, 0));

      expect(penTool["isClosing"]).toBe(false);
    });

    it("clique no primeiro ponto fecha um path com 3 pontos", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 101, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.isClosed).toBe(true);
      expect(p.points).toHaveLength(3);
    });

    it("clique no primeiro ponto fecha um path com 2 pontos", () => {
      const p = makePath();
      p.points = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
      ];
      activatePath(p);
      setMouse({ x: 100, y: 101 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.isClosed).toBe(true);
      expect(p.points).toHaveLength(2);
    });

    it("clique longe do primeiro ponto adiciona ponto em vez de fechar", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 300, y: 300 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.isClosed).toBe(false);
      expect(p.points).toHaveLength(4);
    });

    it("um path com ponto único não fecha (adiciona ponto)", () => {
      const p = new PathElement(
        { x: 100, y: 100 },
        { width: 10, height: 10 },
        1,
      );
      activatePath(p);
      setMouse({ x: 100, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      expect(penTool["isClosing"]).toBe(true);

      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.isClosed).toBe(false);
      expect(p.points).toHaveLength(2);
    });

    it("o fechamento considera a posição do elemento (toWorld)", () => {
      const p = makePath();
      p.points[0] = { x: 20, y: 10 };
      activatePath(p);
      setMouse({ x: 120, y: 110 });
      penTool.onMouseMove(createMouseEvent(0, 0));

      expect(penTool["isClosing"]).toBe(true);

      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.isClosed).toBe(true);
      expect(p.points).toHaveLength(3);
    });

    it("um path já fechado permanece fechado ao clicar no primeiro ponto", () => {
      const p = makePath();
      p.isClosed = true;
      activatePath(p);
      setMouse({ x: 101, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.isClosed).toBe(true);
      expect(p.points).toHaveLength(4);
    });
  });

  describe("desenho do overlay", () => {
    it("draw() não lança erro sem estado ativo", () => {
      expect(() => penTool.draw()).not.toThrow();
    });

    it("draw() renderiza as linhas e pontos do path ativo", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 200, y: 200 });
      penTool.onMouseMove(createMouseEvent(0, 0));

      const context = canvas.getContext("2d")!;
      const arcSpy = vi.spyOn(context, "arc").mockClear();
      const lineToSpy = vi.spyOn(context, "lineTo").mockClear();

      penTool.draw();

      expect(arcSpy).toHaveBeenCalledTimes(3);
      expect(lineToSpy).toHaveBeenCalled();
    });

    it("draw() desenha o indicador de fechamento quando isClosing", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 100, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      expect(penTool["isClosing"]).toBe(true);

      const context = canvas.getContext("2d")!;
      const arcSpy = vi.spyOn(context, "arc").mockClear();

      penTool.draw();

      expect(arcSpy).toHaveBeenCalledTimes(4);
    });
  });
});