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
    const p = new PathElement({ x: 100, y: 100 }, { width: 10, height: 10 }, 1);
    p.points = [
      { center: { x: 0, y: 0 }, in: null, out: null },
      { center: { x: 50, y: 0 }, in: null, out: null },
      { center: { x: 50, y: 50 }, in: null, out: null },
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
      expect(penTool["isClosingPath"]).toBe(false);
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

      expect(eventBus.emit).not.toHaveBeenCalledWith(
        "edit:path",
        expect.anything(),
      );
      expect(p.points).toHaveLength(4);
    });

    it("adiciona pontos recentralizando o path e preservando a geometria", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 200, y: 150 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(4);
      expect(p.position).toEqual({ x: 150, y: 125 });
      expect(p.toWorld(p.points[0]).center).toEqual({ x: 100, y: 100 });
      expect(p.toWorld(p.points[3]).center).toEqual({ x: 200, y: 150 });
    });
  });

  describe("inserção de ponto no meio de um segmento", () => {
    function makeTwoPointLine(): PathElement {
      const p = new PathElement(
        { x: 100, y: 100 },
        { width: 10, height: 10 },
        1,
      );
      p.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 100, y: 0 }, in: null, out: null },
      ];
      return p;
    }

    it("clique no meio de uma linha de dois pontos insere o terceiro entre eles", () => {
      const p = makeTwoPointLine();
      activatePath(p);
      penTool.onKeyDown(
        new KeyboardEvent("keydown", { key: "Shift", shiftKey: true }),
      );
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(3);
      expect(p.toWorld(p.points[0]).center).toEqual({ x: 100, y: 100 });
      expect(p.toWorld(p.points[1]).center).toEqual({ x: 150, y: 100 });
      expect(p.toWorld(p.points[2]).center).toEqual({ x: 200, y: 100 });
    });

    it("clique no meio do primeiro segmento insere após o primeiro vértice", () => {
      const p = makePath();
      activatePath(p);
      penTool.onKeyDown(
        new KeyboardEvent("keydown", { key: "Shift", shiftKey: true }),
      );
      setMouse({ x: 125, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(4);
      expect(p.toWorld(p.points[1]).center).toEqual({ x: 125, y: 100 });
      expect(p.toWorld(p.points[2]).center).toEqual({ x: 150, y: 100 });
      expect(p.toWorld(p.points[3]).center).toEqual({ x: 150, y: 150 });
    });

    it("clique no meio do último segmento insere antes do vértice final", () => {
      const p = makePath();
      activatePath(p);
      penTool.onKeyDown(
        new KeyboardEvent("keydown", { key: "Shift", shiftKey: true }),
      );
      setMouse({ x: 150, y: 125 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(4);
      expect(p.toWorld(p.points[2]).center).toEqual({ x: 150, y: 125 });
      expect(p.toWorld(p.points[3]).center).toEqual({ x: 150, y: 150 });
    });
  });

  describe("seleção do path ativo", () => {
    it("workarea:selectById com um PathElement ativa a edição e o overlay", () => {
      const p = makePath();
      activatePath(p);

      expect(penTool["activePathElement"]).toBe(p);
      // points do overlay são em espaço de tela = world (com mock identity adjust)
      expect(penTool["points"]).toEqual(p.points.map((pt) => p.toWorld(pt)));
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

      expect(penTool["isClosingPath"]).toBe(true);
    });

    it("hover longe do primeiro ponto desmarca isClosing", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 300, y: 300 });
      penTool.onMouseMove(createMouseEvent(0, 0));

      expect(penTool["isClosingPath"]).toBe(false);
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
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 50, y: 0 }, in: null, out: null },
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
      expect(penTool["isClosingPath"]).toBe(true);

      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.isClosed).toBe(false);
      expect(p.points).toHaveLength(2);
    });

    it("o fechamento considera a posição do elemento (toWorld)", () => {
      const p = makePath();
      p.points[0] = {
        center: { x: 20, y: 10 },
        in: null,
        out: null,
      };
      activatePath(p);
      setMouse({ x: 120, y: 110 });
      penTool.onMouseMove(createMouseEvent(0, 0));

      expect(penTool["isClosingPath"]).toBe(true);

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
      penTool.onMouseUp(createMouseEvent(0, 0));

      expect(p.isClosed).toBe(true);
      expect(p.points).toHaveLength(3);
      expect(penTool["selectedPointIndex"]).toBe(0);
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
  });

  describe("seleção e arraste de pontos", () => {
    it("clique em um ponto existente o seleciona sem mover", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(penTool["selectedPointIndex"]).toBe(1);
      expect(p.toWorld(p.points[1]).center).toEqual({ x: 150, y: 100 });
    });

    it("arrastar um ponto o move preservando a geometria dos demais", () => {
      const p = makePath();
      activatePath(p);
      penTool.onKeyDown(
        new KeyboardEvent("keydown", { key: "Control", ctrlKey: true }),
      );
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      setMouse({ x: 200, y: 130 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(3);
      expect(p.toWorld(p.points[1]).center).toEqual({ x: 200, y: 130 });
      expect(p.toWorld(p.points[0]).center).toEqual({ x: 100, y: 100 });
      expect(p.toWorld(p.points[2]).center).toEqual({ x: 150, y: 150 });
    });

    it("movimento pequeno dentro do limiar não move o ponto", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      setMouse({ x: 152, y: 102 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));

      expect(p.toWorld(p.points[1]).center).toEqual({ x: 150, y: 100 });
      expect(penTool["selectedPointIndex"]).toBe(1);
    });

    it("o primeiro ponto não é arrastável (fechamento preservado)", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));
      const before = p.points.length;

      setMouse({ x: 100, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(penTool["isClosingPath"]).toBe(true);
      expect(p.isClosed).toBe(true);
      expect(p.points).toHaveLength(before);
    });

    it("arrastar o primeiro ponto em um path fechado o move sem adicionar ponto", () => {
      const p = makePath();
      p.isClosed = true;
      activatePath(p);
      penTool.onKeyDown(
        new KeyboardEvent("keydown", { key: "Control", ctrlKey: true }),
      );
      setMouse({ x: 100, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      setMouse({ x: 120, y: 140 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(3);
      expect(p.toWorld(p.points[0]).center).toEqual({ x: 120, y: 140 });
    });

    it("clicar no primeiro ponto de um path fechado não insere vértice", () => {
      const p = makePath();
      p.isClosed = true;
      activatePath(p);
      setMouse({ x: 101, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));

      expect(penTool["isClosingPath"]).toBe(false);

      penTool.onMouseDown(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(3);
      expect(penTool["selectedPointIndex"]).toBe(0);
    });

    it("path fechado não exibe indicador de fechamento no primeiro ponto", () => {
      const p = makePath();
      p.isClosed = true;
      activatePath(p);
      setMouse({ x: 101, y: 100 });
      penTool.onMouseMove(createMouseEvent(0, 0));

      expect(penTool["isClosingPath"]).toBe(false);
    });

    it("adicionar ponto emite transformBox:refresh", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 300, y: 300 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(eventBus.emit).toHaveBeenCalledWith("transformBox:refresh");
    });
  });

  describe("remoção e deslocamento por teclado", () => {
    function selectSecondPoint(): void {
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
    }

    beforeEach(() => {
      const p = makePath();
      activatePath(p);
      selectSecondPoint();
    });

    it("Delete remove o ponto selecionado", () => {
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Delete" }));

      expect(penTool["activePathElement"]!.points).toHaveLength(2);
      expect(penTool["selectedPointIndex"]).toBe(1);
    });

    it("Backspace também remove o ponto selecionado", () => {
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Backspace" }));

      expect(penTool["activePathElement"]!.points).toHaveLength(2);
    });

    it("Delete com um único ponto não remove", () => {
      const single = new PathElement(
        { x: 100, y: 100 },
        { width: 10, height: 10 },
        1,
      );
      single.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
      ];
      activatePath(single);
      setMouse({ x: 100, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Delete" }));

      expect(single.points).toHaveLength(1);
    });

    it("setas movem o ponto selecionado", () => {
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      expect(
        penTool["activePathElement"]!.toWorld(
          penTool["activePathElement"]!.points[1],
        ).center,
      ).toEqual({
        x: 151,
        y: 100,
      });
    });

    it("Shift+seta move o ponto selecionado em passos maiores", () => {
      penTool.onKeyDown(
        new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true }),
      );
      expect(
        penTool["activePathElement"]!.toWorld(
          penTool["activePathElement"]!.points[1],
        ).center,
      ).toEqual({
        x: 150,
        y: 110,
      });
    });
  });

  describe("fechamento e cancelamento por teclado", () => {
    it("Enter fecha um path aberto com 3 ou mais pontos", () => {
      const p = makePath();
      activatePath(p);

      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(p.isClosed).toBe(true);
      expect(penTool["selectedPointIndex"]).toBe(-1);
    });

    it("Enter com menos de 3 pontos não fecha e emite alerta", () => {
      const p = new PathElement(
        { x: 100, y: 100 },
        { width: 10, height: 10 },
        1,
      );
      p.points = [
        { center: { x: 0, y: 0 }, in: null, out: null },
        { center: { x: 50, y: 0 }, in: null, out: null },
      ];
      activatePath(p);

      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(p.isClosed).toBe(false);
      expect(eventBus.emit).toHaveBeenCalledWith("alert:add", {
        message: "É preciso pelo menos 3 pontos para fechar a forma.",
        type: "error",
      });
    });

    it("Enter não tem efeito em um path já fechado", () => {
      const p = makePath();
      p.isClosed = true;
      activatePath(p);

      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(p.isClosed).toBe(true);
      expect(p.points).toHaveLength(3);
    });
  });

  describe("constraint com Shift", () => {
    it("Shift+clique alinha o novo ponto ao eixo dominante do último ponto", () => {
      const p = makePath();
      activatePath(p);
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Shift" }));
      setMouse({ x: 300, y: 250 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(4);
      expect(p.toWorld(p.points[3]).center).toEqual({ x: 300, y: 150 });
    });

    it("Shift+clique alinha ao eixo vertical quando ele domina", () => {
      const p = makePath();
      activatePath(p);
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Shift" }));
      setMouse({ x: 250, y: 300 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(4);
      expect(p.toWorld(p.points[3]).center).toEqual({ x: 150, y: 300 });
    });

    it("Shift durante o arraste restringe o ponto em relação à posição original", () => {
      const p = makePath();
      activatePath(p);
      penTool.onKeyDown(
        new KeyboardEvent("keydown", { key: "Control", ctrlKey: true }),
      );
      setMouse({ x: 150, y: 100 });
      penTool.onMouseDown(createMouseEvent(0, 0));
      penTool.onKeyDown(
        new KeyboardEvent("keydown", {
          key: "Shift",
          shiftKey: true,
          ctrlKey: true,
        }),
      );
      setMouse({ x: 220, y: 180 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      penTool.onMouseUp(createMouseEvent(0, 0));

      expect(p.toWorld(p.points[1]).center).toEqual({ x: 150, y: 180 });
    });

    it("soltar Shift desliga o constraint", () => {
      const p = makePath();
      activatePath(p);
      penTool.onKeyDown(new KeyboardEvent("keydown", { key: "Shift" }));
      penTool.onKeyUp(new KeyboardEvent("keyup", { key: "Shift" }));
      setMouse({ x: 300, y: 250 });
      penTool.onMouseDown(createMouseEvent(0, 0));

      expect(p.points).toHaveLength(4);
      expect(p.toWorld(p.points[3]).center).toEqual({ x: 300, y: 250 });
    });
  });

  describe("preview sólido ao fechar", () => {
    it("desenha linha sólida quando isClosing", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 100, y: 101 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      expect(penTool["isClosingPath"]).toBe(true);

      const context = canvas.getContext("2d")!;
      const dashSpy = vi.spyOn(context, "setLineDash").mockClear();

      penTool.draw();

      expect(dashSpy).toHaveBeenCalledWith([]);
    });

    it("desenha linha tracejada quando não está fechando", () => {
      const p = makePath();
      activatePath(p);
      setMouse({ x: 200, y: 200 });
      penTool.onMouseMove(createMouseEvent(0, 0));
      expect(penTool["isClosingPath"]).toBe(false);

      const context = canvas.getContext("2d")!;
      const dashSpy = vi.spyOn(context, "setLineDash").mockClear();

      penTool.draw();

      expect(dashSpy).toHaveBeenCalledWith([2, 2]);
    });
  });

  describe("hint overlay", () => {
    it("equip com path ativo emite pen:hint visível", () => {
      const p = makePath();
      configureRequest({ selected: [p] });
      penTool.equip();

      expect(eventBus.emit).toHaveBeenCalledWith("pen:hint", { visible: true });
    });

    it("unequip emite pen:hint escondido", () => {
      const p = makePath();
      configureRequest({ selected: [p] });
      penTool.equip();
      penTool.unequip();

      expect(eventBus.emit).toHaveBeenCalledWith("pen:hint", {
        visible: false,
      });
    });

    it("deselecionar o path esconde o hint", () => {
      const p = makePath();
      configureRequest({ selected: [p] });
      penTool.equip();
      expect(penTool["hintVisible"]).toBe(true);

      configureRequest({ selected: [{ type: "image" }] });
      eventBus.emit("workarea:selectById", { elementsId: new Set([99]) });

      expect(penTool["hintVisible"]).toBe(false);
    });
  });
});
