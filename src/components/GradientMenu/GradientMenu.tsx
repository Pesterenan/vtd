import { useCallback } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import type { IColorStop } from "../types";
import styles from "./GradientMenu.module.css";
import { GradientElement } from "../elements/gradientElement";
import GradientBar from "./components/GradientBar";
import ColorPicker from "../ColorPicker/ColorPicker";
import SliderControl from "../SliderControl/SliderControl";
import SelectInput from "../SelectInput/SelectInput";
import useElementMenu from "src/hooks/useElementMenu";
import { parseHex, toHex } from "src/utils/color";

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
  const { emit } = useEventBus();
  const {
    activeRef,
    disabled,
    selected,
    state,
    setState,
  } = useElementMenu<GradientElement, GradientMenuState>({
    defaultState: DEFAULT_PROPS,
    findSelected: (els) => els.find((el) => el instanceof GradientElement),
    syncFromElement: (el) => ({
      colorStops: [ ...el.colorStops ],
      activeStopIndex: 0,
      gradientFormat: el.gradientFormat,
    }),
    extraSubscriptions: ["edit:gradientUpdateColorStops"],
  });

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
      const el = activeRef.current;
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
        const prevRgb = parseHex(prev.color);
        const nextRgb = parseHex(next.color);
        return {
          portion,
          color: toHex(
            lerp(prevRgb.r, nextRgb.r),
            lerp(prevRgb.g, nextRgb.g),
            lerp(prevRgb.b, nextRgb.b),
          ),
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
      const el = activeRef.current;
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
      const el = activeRef.current;
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
      const el = activeRef.current;
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
      const el = activeRef.current;
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
      const el = activeRef.current;
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
      const el = activeRef.current;
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
