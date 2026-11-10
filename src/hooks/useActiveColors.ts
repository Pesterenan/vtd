import { useCallback, useEffect, useRef, useState } from "react";
import { useEventBus } from "./useEventBus";
import { activeColors } from "src/utils/color";
import type { ActiveColors, ColorSlot } from "src/utils/color";
import type { Element } from "src/components/elements/element";

type ColorableElement = Element & {
  fillColor?: string;
  strokeColor?: string;
};

const SLOT_PROPERTY: Record<ColorSlot, "fillColor" | "strokeColor"> = {
  fill: "fillColor",
  stroke: "strokeColor",
};

const supportsSlot = (element: Element, slot: ColorSlot): boolean =>
  typeof (element as ColorableElement)[SLOT_PROPERTY[slot]] === "string";

/** Cor exibida: a do primeiro elemento selecionado que tiver a propriedade, senão a ativa. */
const resolveColors = (selected: Element[]): ActiveColors => {
  const fallback = activeColors.get();
  const source = selected.find(
    (element) => supportsSlot(element, "fill") || supportsSlot(element, "stroke"),
  ) as ColorableElement | undefined;
  if (!source) return fallback;

  return {
    fill: source.fillColor ?? fallback.fill,
    stroke: source.strokeColor ?? fallback.stroke,
  };
};

/**
 * Estado híbrido das cores ativas:
 * - com seleção: espelha e edita as cores do elemento selecionado;
 * - sem seleção: mostra/edita o padrão que novos elementos herdam.
 */
export const useActiveColors = () => {
  const { emit, on } = useEventBus();
  const [colors, setColors] = useState<ActiveColors>(() => activeColors.get());
  const selectedRef = useRef<Element[]>([]);

  useEffect(() => {
    const unsubscribeStore = activeColors.subscribe((next) => {
      if (selectedRef.current.length === 0) setColors(next);
    });

    const unsubscribeSelection = on(
      "selection:changed",
      ({ selectedElements }) => {
        selectedRef.current = selectedElements;
        const resolved = resolveColors(selectedElements);
        setColors(resolved);
        if (selectedElements.length > 0) {
          activeColors.set("fill", resolved.fill);
          activeColors.set("stroke", resolved.stroke);
        }
      },
    );

    const unsubscribeColors = on("element:color:changed", () => {
      const resolved = resolveColors(selectedRef.current);
      setColors(resolved);
      if (selectedRef.current.length > 0) {
        activeColors.set("fill", resolved.fill);
        activeColors.set("stroke", resolved.stroke);
      }
    });

    const unsubscribeClear = on("workarea:clear", () => {
      selectedRef.current = [];
      setColors(activeColors.get());
    });

    return () => {
      unsubscribeStore();
      unsubscribeSelection();
      unsubscribeColors();
      unsubscribeClear();
    };
  }, [on]);

  const applyToSelection = useCallback(
    (slot: ColorSlot, value: string) => {
      const property = SLOT_PROPERTY[slot];
      const targets = selectedRef.current.filter((element) =>
        supportsSlot(element, slot),
      ) as ColorableElement[];
      if (targets.length === 0) return;

      for (const element of targets) element[property] = value;
      emit("element:color:changed", {
        elementIds: targets.map((element) => element.elementId),
        slot,
        value,
      });
      emit("workarea:update");
    },
    [emit],
  );

  const setColor = useCallback(
    (slot: ColorSlot, value: string) => {
      const next = activeColors.set(slot, value);
      applyToSelection(slot, next[slot]);
      setColors(next);
    },
    [applyToSelection],
  );

  const setFillColor = useCallback(
    (value: string) => setColor("fill", value),
    [setColor],
  );
  const setStrokeColor = useCallback(
    (value: string) => setColor("stroke", value),
    [setColor],
  );

  const swapColors = useCallback(() => {
    const next = activeColors.swap();
    applyToSelection("fill", next.fill);
    applyToSelection("stroke", next.stroke);
    setColors(next);
  }, [applyToSelection]);

  return {
    fillColor: colors.fill,
    strokeColor: colors.stroke,
    setFillColor,
    setStrokeColor,
    swapColors,
  };
};
