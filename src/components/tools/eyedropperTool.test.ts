import { EyedropperTool } from "./eyedropperTool";
import { EventBus } from "src/utils/eventBus";
import { ImageElement } from "../elements/imageElement";
import { PathElement } from "../elements/pathElement";
import { TextElement } from "../elements/textElement";
import { ElementGroup } from "../elements/elementGroup";
import type { Position } from "../types";

const createPath = (
  position: Position,
  fillColor = "#ff0000",
  strokeColor = "#00ff00",
): PathElement => {
  const path = new PathElement(position, { width: 20, height: 20 }, 0);
  path.fillColor = fillColor;
  path.strokeColor = strokeColor;
  return path;
};

describe("EyedropperTool", () => {
  let canvas: HTMLCanvasElement;
  let eventBus: EventBus;
  let tool: EyedropperTool;
  let mousePosition: Position;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    eventBus = new EventBus();
    tool = new EyedropperTool(canvas, eventBus);
    mousePosition = { x: 100, y: 100 };
    eventBus.on("mouse:position:get", () => mousePosition);
    eventBus.on("workarea:adjustForCanvas", ({ position }) => position);
  });

  const click = () => tool.onMouseDown(new MouseEvent("mousedown"));

  it("copia as cores do elemento clicado para o path selecionado", () => {
    const target = createPath({ x: 0, y: 0 }, "#111111", "#222222");
    const source = createPath({ x: 100, y: 100 }, "#abcdef", "#123456");
    eventBus.on("workarea:selected:get", () => [target]);
    eventBus.on("workarea:elements:get", () => [target, source]);
    const emitSpy = vi.spyOn(eventBus, "emit");

    click();

    expect(target.fillColor).toBe("#abcdef");
    expect(target.strokeColor).toBe("#123456");
    expect(source.fillColor).toBe("#abcdef");
    expect(source.strokeColor).toBe("#123456");
    expect(emitSpy).toHaveBeenCalledWith("element:color:changed", {
      elementIds: [target.elementId],
      slot: "fill",
      value: "#abcdef",
    });
    expect(emitSpy).toHaveBeenCalledWith("element:color:changed", {
      elementIds: [target.elementId],
      slot: "stroke",
      value: "#123456",
    });
    expect(emitSpy).toHaveBeenCalledWith("workarea:update");
  });

  it("copia as cores para um texto selecionado", () => {
    const target = new TextElement(
      { x: 0, y: 0 },
      { width: 100, height: 50 },
      0,
    );
    const source = createPath({ x: 100, y: 100 }, "#abcdef", "#123456");
    eventBus.on("workarea:selected:get", () => [target]);
    eventBus.on("workarea:elements:get", () => [source]);

    click();

    expect(target.fillColor).toBe("#abcdef");
    expect(target.strokeColor).toBe("#123456");
  });

  it("copia para todos os elementos coloríveis selecionados", () => {
    const first = createPath({ x: 0, y: 0 });
    const second = createPath({ x: 0, y: 40 });
    const source = createPath({ x: 100, y: 100 }, "#abcdef", "#123456");
    eventBus.on("workarea:selected:get", () => [first, second]);
    eventBus.on("workarea:elements:get", () => [source]);

    click();

    expect(first.fillColor).toBe("#abcdef");
    expect(second.fillColor).toBe("#abcdef");
  });

  it("encontra um path dentro de um grupo", () => {
    const target = createPath({ x: 0, y: 0 }, "#111111", "#222222");
    const source = createPath({ x: 100, y: 100 }, "#abcdef", "#123456");
    const group = new ElementGroup(
      { x: 0, y: 0 },
      { width: 0, height: 0 },
      0,
      [source],
    );
    eventBus.on("workarea:selected:get", () => [target]);
    eventBus.on("workarea:elements:get", () => [group]);

    click();

    expect(target.fillColor).toBe("#abcdef");
    expect(target.strokeColor).toBe("#123456");
  });

  it("não altera o destino quando o clique não atinge um elemento colorível", () => {
    const target = createPath({ x: 0, y: 0 }, "#111111", "#222222");
    const image = new ImageElement(
      { x: 100, y: 100 },
      { width: 20, height: 20 },
      0,
    );
    eventBus.on("workarea:selected:get", () => [target]);
    eventBus.on("workarea:elements:get", () => [image]);
    const emitSpy = vi.spyOn(eventBus, "emit");

    click();

    expect(target.fillColor).toBe("#111111");
    expect(target.strokeColor).toBe("#222222");
    expect(emitSpy).not.toHaveBeenCalledWith(
      "element:color:changed",
      expect.anything(),
    );
  });

  it("não faz nada sem um path ou texto selecionado", () => {
    const source = createPath({ x: 100, y: 100 }, "#abcdef", "#123456");
    eventBus.on("workarea:selected:get", () => []);
    eventBus.on("workarea:elements:get", () => [source]);
    const emitSpy = vi.spyOn(eventBus, "emit");

    click();

    expect(source.fillColor).toBe("#abcdef");
    expect(emitSpy).not.toHaveBeenCalledWith(
      "element:color:changed",
      expect.anything(),
    );
  });

  it("não copia do próprio elemento selecionado", () => {
    const source = createPath({ x: 100, y: 100 }, "#abcdef", "#123456");
    eventBus.on("workarea:selected:get", () => [source]);
    eventBus.on("workarea:elements:get", () => [source]);
    const emitSpy = vi.spyOn(eventBus, "emit");

    click();

    expect(emitSpy).not.toHaveBeenCalledWith(
      "element:color:changed",
      expect.anything(),
    );
  });

  it("mostra o hint e usa o cursor customizado ao equipar", () => {
    const emitSpy = vi.spyOn(eventBus, "emit");

    tool.equip();

    expect(canvas.style.cursor).toBe("none");
    expect(emitSpy).toHaveBeenCalledWith("tool:hint", {
      hintText: expect.stringContaining("destino"),
    });
  });

  it("restaura o cursor e esconde o hint ao desequipar", () => {
    tool.equip();
    const emitSpy = vi.spyOn(eventBus, "emit");

    tool.unequip();

    expect(canvas.style.cursor).toBe("");
    expect(emitSpy).toHaveBeenCalledWith("tool:hint", { hintText: "" });
  });
});
