import { act, createElement } from "react";
import { renderHook } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import { PathElement } from "src/components/elements/pathElement";
import { GradientElement } from "src/components/elements/gradientElement";
import { activeColors, DEFAULT_ACTIVE_COLORS } from "src/utils/color";
import { useActiveColors } from "./useActiveColors";
import type { ReactNode } from "react";

const createPath = (): PathElement => {
  const element = new PathElement(
    { x: 0, y: 0 },
    { width: 100, height: 100 },
    1,
  );
  element.fillColor = "#ff0000";
  element.strokeColor = "#00ff00";
  return element;
};

const setup = () => {
  const eventBus = new EventBus();
  const emitSpy = vi.spyOn(eventBus, "emit");
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(EventBusProvider, { eventBus, children });
  const hook = renderHook(() => useActiveColors(), { wrapper });
  return { eventBus, emitSpy, ...hook };
};

describe("useActiveColors", () => {
  beforeEach(() => {
    activeColors.reset();
  });

  it("inicia com as cores ativas do store", () => {
    const { result } = setup();
    expect(result.current.fillColor).toBe(DEFAULT_ACTIVE_COLORS.fill);
    expect(result.current.strokeColor).toBe(DEFAULT_ACTIVE_COLORS.stroke);
  });

  it("espelha as cores do elemento selecionado e as torna ativas", () => {
    const { eventBus, result } = setup();
    const path = createPath();

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [path] });
    });

    expect(result.current.fillColor).toBe("#ff0000");
    expect(result.current.strokeColor).toBe("#00ff00");
    expect(activeColors.get()).toEqual({
      fill: "#ff0000",
      stroke: "#00ff00",
    });
  });

  it("aplica a cor no elemento selecionado e emite os eventos", () => {
    const { eventBus, emitSpy, result } = setup();
    const path = createPath();

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [path] });
    });
    act(() => {
      result.current.setFillColor("#123456");
    });

    expect(path.fillColor).toBe("#123456");
    expect(result.current.fillColor).toBe("#123456");
    expect(activeColors.get().fill).toBe("#123456");
    expect(emitSpy).toHaveBeenCalledWith("element:color:changed", {
      elementIds: [path.elementId],
      slot: "fill",
      value: "#123456",
    });
    expect(emitSpy).toHaveBeenCalledWith("workarea:update");
  });

  it("troca preenchimento e contorno no store e no elemento selecionado", () => {
    const { eventBus, result } = setup();
    const path = createPath();

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [path] });
    });
    act(() => {
      result.current.swapColors();
    });

    expect(path.fillColor).toBe("#00ff00");
    expect(path.strokeColor).toBe("#ff0000");
    expect(result.current.fillColor).toBe("#00ff00");
    expect(result.current.strokeColor).toBe("#ff0000");
    expect(activeColors.get()).toEqual({
      fill: "#00ff00",
      stroke: "#ff0000",
    });
  });

  it("sem seleção, edita apenas o padrão ativo", () => {
    const { emitSpy, result } = setup();

    act(() => {
      result.current.setStrokeColor("#abcdef");
    });

    expect(result.current.strokeColor).toBe("#abcdef");
    expect(activeColors.get().stroke).toBe("#abcdef");
    expect(emitSpy).not.toHaveBeenCalledWith(
      "element:color:changed",
      expect.anything(),
    );
  });

  it("não aplica cor em elementos que não têm a propriedade", () => {
    const { eventBus, emitSpy, result } = setup();
    const gradient = new GradientElement(
      { x: 0, y: 0 },
      { width: 10, height: 10 },
      1,
    );

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [gradient] });
    });
    expect(result.current.fillColor).toBe(DEFAULT_ACTIVE_COLORS.fill);

    act(() => {
      result.current.setFillColor("#abcdef");
    });

    expect(result.current.fillColor).toBe("#abcdef");
    expect(emitSpy).not.toHaveBeenCalledWith(
      "element:color:changed",
      expect.anything(),
    );
  });

  it("ressincroniza quando um menu altera a cor do elemento", () => {
    const { eventBus, result } = setup();
    const path = createPath();

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [path] });
    });
    path.fillColor = "#00ff00";

    act(() => {
      eventBus.emit("element:color:changed", {
        elementIds: [path.elementId],
        slot: "fill",
        value: "#00ff00",
      });
    });

    expect(result.current.fillColor).toBe("#00ff00");
    expect(activeColors.get()).toEqual({
      fill: "#00ff00",
      stroke: "#00ff00",
    });
  });

  it("ignora cores inválidas", () => {
    const { eventBus, result } = setup();
    const path = createPath();

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [path] });
    });
    act(() => {
      result.current.setFillColor("vermelho");
    });

    expect(path.fillColor).toBe("#ff0000");
    expect(result.current.fillColor).toBe("#ff0000");
  });
});
