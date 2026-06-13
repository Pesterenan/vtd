import { useState, useRef, useEffect, useCallback } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import type { IColorStop } from "../types";
import styles from "./GradientMenu.module.css";
import { GradientElement } from "../elements/gradientElement";
import GradientBar from "./components/GradientBar";
import ColorPicker from "../ColorPicker/ColorPicker";
import SliderControl from "../SliderControl/SliderControl";
import SelectInput from "../SelectInput/SelectInput";

interface GradientMenuState {
  colorStops: IColorStop[];
  activeStopIndex: number | null;
  gradientFormat: string;
}

const DEFAULT_PROPS: GradientMenuState = {
  colorStops: [],
  activeStopIndex: null,
  gradientFormat: "linear",
};

const GradientMenu = () => {
  const { on, emit } = useEventBus();
  const [disabled, setDisabled] = useState(true);
  const [selected, setSelected] = useState(false);
  const [state, setState] = useState<GradientMenuState>(DEFAULT_PROPS);
  const activeElementRef = useRef<GradientElement | null>(null);

  useEffect(() => {
    const unsub1 = on("workarea:initialized", () => setDisabled(false));
    const unsub2 = on("workarea:clear", () => {
      setSelected(false);
      setDisabled(true);
      setState(DEFAULT_PROPS);
      activeElementRef.current = null;
    });
    const unsub3 = on("edit:gradient", () => {
      setSelected(true);
    });
    const unsub4 = on("edit:gradientUpdateColorStops", () => {
      const el = activeElementRef.current;
      if (el) {
        setState((prev) => ({
          ...prev,
          colorStops: [...el.colorStops],
        }));
      }
    });
    const unsub5 = on("selection:changed", ({ selectedElements }) => {
      const gradientElement = selectedElements.find(
        (el) => el instanceof GradientElement,
      ) as GradientElement | undefined;
      if (gradientElement) {
        activeElementRef.current = gradientElement;
        setSelected(true);
        setState({
          colorStops: [...gradientElement.colorStops],
          activeStopIndex: 0,
          gradientFormat: gradientElement.gradientFormat,
        });
      } else {
        setSelected(false);
        setState(DEFAULT_PROPS);
        activeElementRef.current = null;
      }
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [on]);

  const activeStop =
    state.activeStopIndex !== null
      ? (state.colorStops[state.activeStopIndex] ?? null)
      : null;

  const isFirstStop = state.activeStopIndex === 0;
  const isLastStop = state.activeStopIndex === state.colorStops.length - 1;

  const updateElement = useCallback(() => {
    emit("workarea:update");
  }, [emit]);

  const handleAddStop = useCallback(
    (portion: number) => {
      const el = activeElementRef.current;
      if (!el) return;

      const stops = el.colorStops;
      const insertIdx = stops.findIndex((s) => s.portion > portion);
      const idx = insertIdx === -1 ? stops.length : insertIdx;

      const interpolate = (): IColorStop => {
        if (idx === 0)
          return { portion, color: stops[0].color, alpha: stops[0].alpha };
        if (idx >= stops.length)
          return {
            portion,
            color: stops[stops.length - 1].color,
            alpha: stops[stops.length - 1].alpha,
          };
        const prev = stops[idx - 1];
        const next = stops[idx];
        const t = (portion - prev.portion) / (next.portion - prev.portion);
        const lerp = (a: number, b: number) => a + (b - a) * t;
        const hex = (c: number) => Math.round(c).toString(16).padStart(2, "0");
        const pr = parseInt(prev.color.slice(1, 3), 16);
        const pg = parseInt(prev.color.slice(3, 5), 16);
        const pb = parseInt(prev.color.slice(5, 7), 16);
        const nr = parseInt(next.color.slice(1, 3), 16);
        const ng = parseInt(next.color.slice(3, 5), 16);
        const nb = parseInt(next.color.slice(5, 7), 16);
        return {
          portion,
          color: `#${hex(lerp(pr, nr))}${hex(lerp(pg, ng))}${hex(lerp(pb, nb))}`,
          alpha: lerp(prev.alpha, next.alpha),
        };
      };

      const newStop = interpolate();
      const sorted = [...stops, newStop].sort((a, b) => a.portion - b.portion);
      const newIdx = sorted.findIndex((s) => s.portion === portion);

      el.colorStops = sorted;
      setState((prev) => ({
        ...prev,
        colorStops: [...sorted],
        activeStopIndex: newIdx,
      }));
      emit("edit:gradientUpdateColorStops");
      updateElement();
    },
    [emit, updateElement],
  );

  const handleSelectStop = useCallback((index: number) => {
    setState((prev) => ({ ...prev, activeStopIndex: index }));
  }, []);

  const handleDeleteStop = useCallback(
    (index: number) => {
      const el = activeElementRef.current;
      if (!el || el.colorStops.length <= 2) return;
      if (index === 0 || index === el.colorStops.length - 1) return;

      const newStops = el.colorStops.filter((_, i) => i !== index);
      el.colorStops = newStops;
      const newIndex = Math.min(index, newStops.length - 1);
      setState((prev) => ({
        ...prev,
        colorStops: [...newStops],
        activeStopIndex: newIndex,
      }));
      emit("edit:gradientUpdateColorStops");
      updateElement();
    },
    [emit, updateElement],
  );

  const handleDragStop = useCallback(
    (index: number, portion: number) => {
      const el = activeElementRef.current;
      if (!el) return;

      const clamped = (() => {
        const stops = el.colorStops;
        const min = index > 0 ? stops[index - 1].portion + 0.01 : 0;
        const max =
          index < stops.length - 1 ? stops[index + 1].portion - 0.01 : 1;
        return Math.max(min, Math.min(max, portion));
      })();

      const newStops = el.colorStops.map((s, i) =>
        i === index ? { ...s, portion: clamped } : s,
      );
      el.colorStops = newStops;
      setState((prev) => ({
        ...prev,
        colorStops: [...newStops],
      }));
      emit("edit:gradientUpdateColorStops");
      updateElement();
    },
    [emit, updateElement],
  );

  const handleColorChange = useCallback(
    (color: string) => {
      const el = activeElementRef.current;
      if (!el || state.activeStopIndex === null) return;
      const newStops = el.colorStops.map((s, i) =>
        i === state.activeStopIndex ? { ...s, color } : s,
      );
      el.colorStops = newStops;
      setState((prev) => ({
        ...prev,
        colorStops: [...newStops],
      }));
      updateElement();
    },
    [state.activeStopIndex, updateElement],
  );

  const handleAlphaChange = useCallback(
    (value: number) => {
      const el = activeElementRef.current;
      if (!el || state.activeStopIndex === null) return;
      const newStops = el.colorStops.map((s, i) =>
        i === state.activeStopIndex ? { ...s, alpha: value } : s,
      );
      el.colorStops = newStops;
      setState((prev) => ({
        ...prev,
        colorStops: [...newStops],
      }));
      updateElement();
    },
    [state.activeStopIndex, updateElement],
  );

  const handlePortionChange = useCallback(
    (value: number) => {
      const el = activeElementRef.current;
      if (!el || state.activeStopIndex === null) return;

      const clamped = (() => {
        const stops = el.colorStops;
        const idx = state.activeStopIndex;
        const min = idx > 0 ? stops[idx - 1].portion + 0.01 : 0;
        const max = idx < stops.length - 1 ? stops[idx + 1].portion - 0.01 : 1;
        return Math.max(min, Math.min(max, value));
      })();

      const newStops = el.colorStops.map((s, i) =>
        i === state.activeStopIndex ? { ...s, portion: clamped } : s,
      );
      el.colorStops = newStops;
      setState((prev) => ({
        ...prev,
        colorStops: [...newStops],
      }));
      updateElement();
    },
    [state.activeStopIndex, updateElement],
  );

  const handleFormatChange = useCallback(
    (newFormat: string) => {
      const el = activeElementRef.current;
      if (!el) return;
      el.gradientFormat = newFormat as GradientElement["gradientFormat"];
      setState((prev) => ({ ...prev, gradientFormat: newFormat }));
      updateElement();
    },
    [updateElement],
  );

  const isDisabled = disabled || !selected;

  return (
    <section className={styles.section}>
      <h5>Gradiente:</h5>

      <GradientBar
        colorStops={state.colorStops}
        activeIndex={state.activeStopIndex}
        format={state.gradientFormat}
        onAddStop={handleAddStop}
        onSelectStop={handleSelectStop}
        onDeleteStop={handleDeleteStop}
        onDragStop={handleDragStop}
      />

      {activeStop && (
        <div className={styles.controlsGroup}>
          <div className={styles.row}>
            <ColorPicker
              id="inp_portion_color"
              label="Cor"
              value={activeStop.color}
              onChange={handleColorChange}
              disabled={isDisabled}
            />
            <SliderControl
              id="inp_portion_alpha"
              label="Alpha"
              min={0}
              max={1}
              step={0.01}
              value={activeStop.alpha}
              onChange={handleAlphaChange}
              disabled={isDisabled}
            />
          </div>
        </div>
      )}

      <div className={styles.row}>
        <SelectInput
          id={"gradient-format-select"}
          label={"Formato"}
          options={[
            { value: "conic", label: "Cônico" },
            { value: "linear", label: "Linear" },
            { value: "radial", label: "Radial" },
          ]}
          value={state.gradientFormat}
          onChange={handleFormatChange}
          disabled={isDisabled}
        />
        <SliderControl
          id="inp_portion_position"
          label="Posição"
          disabled={isDisabled || isFirstStop || isLastStop}
          min={0}
          max={1}
          step={0.01}
          value={activeStop?.portion ?? 0}
          onChange={handlePortionChange}
        />
      </div>
    </section>
  );
};

export default GradientMenu;
