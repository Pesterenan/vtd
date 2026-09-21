import { useEffect, useRef, useState } from "react";
import { useEventBus } from "./useEventBus";
import type { Element } from "src/components/elements/element";
import type { EventBusMap } from "src/utils/eventBus";

type UseElementMenuOptions<TElement, TState> = {
  defaultState: TState;
  findSelected: (els: Element[]) => TElement | undefined;
  syncFromElement: (el: TElement) => TState;
  extraSubscriptions?: Array<keyof EventBusMap>;
};

const useElementMenu = <TElement, TState>({
  defaultState,
  findSelected,
  syncFromElement,
  extraSubscriptions,
}: UseElementMenuOptions<TElement, TState>) => {
  const { on, emit } = useEventBus();
  const [disabled, setDisabled] = useState(true);
  const [selected, setSelected] = useState(false);
  const [state, setState] = useState<TState>(defaultState);
  const activeRef = useRef<TElement | null>(null);

  const deselect = () => {
    setSelected(false);
    activeRef.current = null;
  };

  const reset = () => {
    setSelected(false);
    setDisabled(true);
    setState(defaultState);
    activeRef.current = null;
  };

  useEffect(() => {
    const unsub1 = on("workarea:initialized", () => setDisabled(false));
    const unsub2 = on("workarea:clear", () => reset());
    const unsub3 = on("selection:changed", ({ selectedElements }) => {
      const element = findSelected(selectedElements);
      if (element) {
        activeRef.current = element;
        setSelected(true);
        setState(syncFromElement(element));
      } else {
        setSelected(false);
        setState(defaultState);
        activeRef.current = null;
      }
    });
    const extraUnsubs = (extraSubscriptions ?? []).map((eventName) =>
      on(eventName, () => {
        const el = activeRef.current;
        if (el) setState(syncFromElement(el));
      }),
    );
    return () => {
      unsub1();
      unsub2();
      unsub3();
      extraUnsubs.forEach((unsub) => unsub());
    };
  }, [on, extraSubscriptions]);

  const bindProp =
    <K extends keyof TState>(
      key: K,
      apply: (el: TElement, value: TState[K]) => void,
    ) =>
    (value: TState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
      const el = activeRef.current;
      if (el) {
        apply(el, value);
        emit("workarea:update");
      }
    };

  return {
    activeRef,
    deselect,
    disabled,
    reset,
    selected,
    setState,
    state,
    bindProp,
  };
};

export default useElementMenu;
