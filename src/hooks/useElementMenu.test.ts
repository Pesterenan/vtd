import { act, createElement } from "react";
import { renderHook } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import { PathElement } from "src/components/elements/pathElement";
import { GradientElement } from "src/components/elements/gradientElement";
import useElementMenu from "./useElementMenu";
import type { ReactNode } from "react";
import type { Element } from "src/components/elements/element";

interface TestMenuState {
  hasFill: boolean;
  strokeWidth: number;
}

const DEFAULT_STATE: TestMenuState = {
  hasFill: false,
  strokeWidth: 2,
};

const findPathSelected = (
  els: Element[],
): PathElement | undefined =>
  els.find((el) => el instanceof PathElement) as PathElement | undefined;

const syncPathState = (el: PathElement): TestMenuState => ({
  hasFill: el.hasFill,
  strokeWidth: el.strokeWidth,
});

const createPathElement = (): PathElement => {
  const el = new PathElement({ x: 0, y: 0 }, { width: 100, height: 50 }, 1);
  el.hasFill = true;
  el.strokeWidth = 7;
  return el;
};

const setup = () => {
  const eventBus = new EventBus();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(EventBusProvider, { eventBus, children });
  const hook = renderHook(
    () =>
      useElementMenu<PathElement, TestMenuState>({
        defaultState: DEFAULT_STATE,
        findSelected: findPathSelected,
        syncFromElement: syncPathState,
      }),
    { wrapper },
  );
  return { eventBus, ...hook };
};

describe("useElementMenu", () => {
  it("inicia desabilitado, sem seleção e com o estado padrão", () => {
    const { result } = setup();
    expect(result.current.disabled).toBe(true);
    expect(result.current.selected).toBe(false);
    expect(result.current.state).toEqual(DEFAULT_STATE);
    expect(result.current.activeRef.current).toBeNull();
  });

  it("habilita o menu ao receber workarea:initialized", () => {
    const { eventBus, result } = setup();
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    expect(result.current.disabled).toBe(false);
    expect(result.current.selected).toBe(false);
    expect(result.current.state).toEqual(DEFAULT_STATE);
  });

  it("seleciona e sincroniza o estado a partir do elemento correspondente", () => {
    const { eventBus, result } = setup();
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const el = createPathElement();
    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [el] });
    });
    expect(result.current.selected).toBe(true);
    expect(result.current.activeRef.current).toBe(el);
    expect(result.current.state).toEqual({ hasFill: true, strokeWidth: 7 });
  });

  it("limpa a seleção e restaura o padrão quando nada correspondente é selecionado", () => {
    const { eventBus, result } = setup();
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const el = createPathElement();
    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [el] });
    });
    expect(result.current.selected).toBe(true);

    const other = new GradientElement(
      { x: 0, y: 0 },
      { width: 10, height: 10 },
      2,
    );
    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [other] });
    });
    expect(result.current.selected).toBe(false);
    expect(result.current.state).toEqual(DEFAULT_STATE);
    expect(result.current.activeRef.current).toBeNull();
    // seleção sem correspondente não re-desabilita o menu já inicializado
    expect(result.current.disabled).toBe(false);

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [] });
    });
    expect(result.current.selected).toBe(false);
    expect(result.current.state).toEqual(DEFAULT_STATE);
    expect(result.current.activeRef.current).toBeNull();
  });

  it("deseleciona e expõe deselect()", () => {
    const { eventBus, result } = setup();
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const el = createPathElement();
    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [el] });
    });
    act(() => {
      eventBus.emit("workarea:clear");
    });
    expect(result.current.disabled).toBe(true);
    expect(result.current.selected).toBe(false);
    expect(result.current.state).toEqual(DEFAULT_STATE);
    expect(result.current.activeRef.current).toBeNull();

    // reset() manual restaura seleção/estado/ref sem depender do evento
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [el] });
    });
    expect(result.current.selected).toBe(true);
    act(() => {
      result.current.deselect();
    });
    expect(result.current.selected).toBe(false);
    expect(result.current.state).not.toEqual(DEFAULT_STATE);
    expect(result.current.activeRef.current).toBeNull();
  });

  it("reseta tudo ao receber workarea:clear e expõe reset()", () => {
    const { eventBus, result } = setup();
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const el = createPathElement();
    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [el] });
    });
    act(() => {
      eventBus.emit("workarea:clear");
    });
    expect(result.current.disabled).toBe(true);
    expect(result.current.selected).toBe(false);
    expect(result.current.state).toEqual(DEFAULT_STATE);
    expect(result.current.activeRef.current).toBeNull();

    // reset() manual restaura seleção/estado/ref sem depender do evento
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [el] });
    });
    expect(result.current.selected).toBe(true);
    act(() => {
      result.current.reset();
    });
    expect(result.current.selected).toBe(false);
    expect(result.current.state).toEqual(DEFAULT_STATE);
    expect(result.current.activeRef.current).toBeNull();
  });

  it("expõe setState e bindProp aplica no elemento ativo e emite workarea:update", () => {
    const eventBus = new EventBus();
    vi.spyOn(eventBus, "emit");
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(EventBusProvider, { eventBus, children });
    const { result } = renderHook(
      () =>
        useElementMenu<PathElement, TestMenuState>({
          defaultState: DEFAULT_STATE,
          findSelected: findPathSelected,
          syncFromElement: syncPathState,
        }),
      { wrapper },
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const el = createPathElement();
    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [el] });
    });

    act(() => {
      result.current.setState({ hasFill: false, strokeWidth: 99 });
    });
    expect(result.current.state).toEqual({ hasFill: false, strokeWidth: 99 });

    let applyStrokeWidth: (value: number) => void = () => undefined;
    act(() => {
      applyStrokeWidth = result.current.bindProp(
        "strokeWidth",
        (target, value) => {
          target.strokeWidth = value;
        },
      );
    });
    act(() => {
      applyStrokeWidth(21);
    });
    expect(result.current.state.strokeWidth).toBe(21);
    expect(el.strokeWidth).toBe(21);
    expect(eventBus.emit).toHaveBeenCalledWith("workarea:update");
  });

  it("bindProp sem elemento ativo atualiza só o estado local e não emite workarea:update", () => {
    const eventBus = new EventBus();
    vi.spyOn(eventBus, "emit");
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(EventBusProvider, { eventBus, children });
    const { result } = renderHook(
      () =>
        useElementMenu<PathElement, TestMenuState>({
          defaultState: DEFAULT_STATE,
          findSelected: findPathSelected,
          syncFromElement: syncPathState,
        }),
      { wrapper },
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });

    let applyHasFill: (value: boolean) => void = () => undefined;
    act(() => {
      applyHasFill = result.current.bindProp("hasFill", (target, value) => {
        target.hasFill = value;
      });
    });
    expect(() => {
      act(() => {
        applyHasFill(true);
      });
    }).not.toThrow();
    expect(result.current.state.hasFill).toBe(true);
    expect(eventBus.emit).not.toHaveBeenCalledWith("workarea:update");
  });

  it("ressincroniza o estado a partir do elemento ativo no evento extra", () => {
    // Hipótese: extraSubscriptions é string[] de eventos do EventBus que
    // disparam setState(syncFromElement(activeRef.current)). Se o plano
    // definir outro formato (ex. mapa evento→handler), ajuste este teste.
    const eventBus = new EventBus();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(EventBusProvider, { eventBus, children });
    const { result } = renderHook(
      () =>
        useElementMenu<PathElement, TestMenuState>({
          defaultState: DEFAULT_STATE,
          findSelected: findPathSelected,
          syncFromElement: syncPathState,
          extraSubscriptions: ["edit:gradientUpdateColorStops"],
        }),
      { wrapper },
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const el = createPathElement();
    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [el] });
    });
    // mutação externa (ex. ferramenta no canvas) + notificação extra
    el.strokeWidth = 42;
    act(() => {
      eventBus.emit("edit:gradientUpdateColorStops");
    });
    expect(result.current.state.strokeWidth).toBe(42);
    expect(result.current.state.hasFill).toBe(true);
  });

  it("remove as inscrições do EventBus no unmount", () => {
    const eventBus = new EventBus();
    vi.spyOn(eventBus, "off");
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(EventBusProvider, { eventBus, children });
    const { unmount } = renderHook(
      () =>
        useElementMenu<PathElement, TestMenuState>({
          defaultState: DEFAULT_STATE,
          findSelected: findPathSelected,
          syncFromElement: syncPathState,
        }),
      { wrapper },
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    unmount();
    expect(eventBus.off).toHaveBeenCalledWith(
      "workarea:initialized",
      expect.anything(),
    );
    expect(eventBus.off).toHaveBeenCalledWith(
      "workarea:clear",
      expect.anything(),
    );
    expect(eventBus.off).toHaveBeenCalledWith(
      "selection:changed",
      expect.anything(),
    );
  });
});
