import { useEffect, useRef, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import { PathElement } from "../elements/pathElement";
import styles from "./PathMenu.module.css";
import CheckboxInput from "../CheckboxInput/CheckboxInput";
import ColorPicker from "../ColorPicker/ColorPicker";
import SliderControl from "../SliderControl/SliderControl";
import SelectInput from "../SelectInput/SelectInput";
import type { ISelectOption } from "../SelectInput/SelectInput";
import type { Point } from "../types";

interface PathMenuState {
  fillColor: string;
  hasFill: boolean;
  hasStroke: boolean;
  isClosed: boolean;
  lineCap: "butt" | "round" | "square";
  lineDash: "solid" | "dashed" | "dotted";
  lineJoin: "miter" | "round" | "bevel";
  miterLimit: number;
  points: Point[];
  strokeColor: string;
  strokeWidth: number;
}

const DEFAULT_PROPS: PathMenuState = {
  fillColor: "#FFFFFF",
  hasFill: false,
  hasStroke: true,
  isClosed: false,
  lineCap: "round",
  lineDash: "solid",
  lineJoin: "miter",
  miterLimit: 10,
  points: [],
  strokeColor: "#000000",
  strokeWidth: 2,
};

const LINE_CAP_OPTIONS: ISelectOption[] = [
  { label: "Butt", value: "butt" },
  { label: "Round", value: "round" },
  { label: "Square", value: "square" },
];

const LINE_JOIN_OPTIONS: ISelectOption[] = [
  { label: "Miter", value: "miter" },
  { label: "Round", value: "round" },
  { label: "Bevel", value: "bevel" },
];

const LINE_DASH_OPTIONS: ISelectOption[] = [
  { label: "Sólido", value: "solid" },
  { label: "Tracejado", value: "dashed" },
  { label: "Pontilhado", value: "dotted" },
];

const PathMenu = () => {
  const { on, emit } = useEventBus();
  const [disabled, setDisabled] = useState(true);
  const [selected, setSelected] = useState(false);
  const [pathProps, setPathProps] = useState<PathMenuState>(DEFAULT_PROPS);
  const activeElementRef = useRef<PathElement | null>(null);

  useEffect(() => {
    const unsub1 = on("workarea:initialized", () => setDisabled(false));
    const unsub2 = on("workarea:clear", () => {
      setSelected(false);
      setDisabled(true);
      setPathProps(DEFAULT_PROPS);
      activeElementRef.current = null;
    });
    const unsub3 = on("selection:changed", ({ selectedElements }) => {
      const pathElement = selectedElements.find(
        (el) => el instanceof PathElement,
      ) as PathElement | undefined;
      if (pathElement) {
        activeElementRef.current = pathElement;
        setSelected(true);
        setPathProps({
          fillColor: pathElement.fillColor,
          hasFill: pathElement.hasFill,
          hasStroke: pathElement.hasStroke,
          isClosed: pathElement.isClosed,
          lineCap: pathElement.lineCap,
          lineDash: pathElement.lineDash,
          lineJoin: pathElement.lineJoin,
          miterLimit: pathElement.miterLimit,
          points: pathElement.points,
          strokeColor: pathElement.strokeColor,
          strokeWidth: pathElement.strokeWidth,
        });
      } else {
        setSelected(false);
        setPathProps(DEFAULT_PROPS);
        activeElementRef.current = null;
      }
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [on]);

  const updateProp = <K extends keyof PathMenuState>(
    key: K,
    value: PathMenuState[K],
  ) => {
    setPathProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleFill = (checked: boolean) => {
    updateProp("hasFill", checked);
    if (activeElementRef.current) {
      activeElementRef.current.hasFill = checked;
      emit("workarea:update");
    }
  };

  const handleToggleStroke = (checked: boolean) => {
    updateProp("hasStroke", checked);
    if (activeElementRef.current) {
      activeElementRef.current.hasStroke = checked;
      emit("workarea:update");
    }
  };

  const handleChangeStrokeColor = (color: string): void => {
    updateProp("strokeColor", color);
    if (activeElementRef.current) {
      activeElementRef.current.strokeColor = color;
      emit("workarea:update");
    }
  };

  const handleChangeFillColor = (color: string) => {
    updateProp("fillColor", color);
    if (activeElementRef.current) {
      activeElementRef.current.fillColor = color;
      emit("workarea:update");
    }
  };

  const handleChangeStrokeWidth = (value: number) => {
    updateProp("strokeWidth", value);
    if (activeElementRef.current) {
      activeElementRef.current.strokeWidth = value;
      emit("workarea:update");
    }
  };

  const handleChangeLineCap = (value: string) => {
    const lineCap = value as PathMenuState["lineCap"];
    updateProp("lineCap", lineCap);
    if (activeElementRef.current) {
      activeElementRef.current.lineCap = lineCap;
      emit("workarea:update");
    }
  };

  const handleChangeLineJoin = (value: string) => {
    const lineJoin = value as PathMenuState["lineJoin"];
    updateProp("lineJoin", lineJoin);
    if (activeElementRef.current) {
      activeElementRef.current.lineJoin = lineJoin;
      emit("workarea:update");
    }
  };

  const handleChangeLineDash = (value: string) => {
    const lineDash = value as PathMenuState["lineDash"];
    updateProp("lineDash", lineDash);
    if (activeElementRef.current) {
      activeElementRef.current.lineDash = lineDash;
      emit("workarea:update");
    }
  };

  const handleChangeMiterLimit = (value: number) => {
    updateProp("miterLimit", value);
    if (activeElementRef.current) {
      activeElementRef.current.miterLimit = value;
      emit("workarea:update");
    }
  };

  const isDisabled = disabled || !selected;

  return (
    <section className={styles.section} aria-disabled={isDisabled}>
      <h5>Path:</h5>
      <div className={styles.row}>
        <CheckboxInput
          id={"path-fill"}
          label={"Preenchimento"}
          checked={pathProps.hasFill}
          disabled={isDisabled}
          onChange={handleToggleFill}
        />
        <ColorPicker
          id={"path-fill-color"}
          label={"Cor"}
          value={pathProps.fillColor}
          disabled={isDisabled || !pathProps.hasFill}
          onChange={handleChangeFillColor}
        />
      </div>
      <div className={styles.row}>
        <CheckboxInput
          id={"path-stroke"}
          label={"Contorno"}
          checked={pathProps.hasStroke}
          disabled={isDisabled}
          onChange={handleToggleStroke}
        />
        <ColorPicker
          id={"path-stroke-color"}
          label={"Cor"}
          value={pathProps.strokeColor}
          disabled={isDisabled || !pathProps.hasStroke}
          onChange={handleChangeStrokeColor}
        />
      </div>
      <SliderControl
        id={"path-stroke-width"}
        disabled={isDisabled || !pathProps.hasStroke}
        label={"Espessura"}
        min={1}
        max={128}
        step={1}
        value={pathProps.strokeWidth}
        onChange={handleChangeStrokeWidth}
      />
      <SelectInput
        id={"path-line-cap"}
        label={"Extremidade"}
        options={LINE_CAP_OPTIONS}
        value={pathProps.lineCap}
        disabled={isDisabled || !pathProps.hasStroke}
        onChange={handleChangeLineCap}
      />
      <SelectInput
        id={"path-line-join"}
        label={"Junção"}
        options={LINE_JOIN_OPTIONS}
        value={pathProps.lineJoin}
        disabled={isDisabled || !pathProps.hasStroke}
        onChange={handleChangeLineJoin}
      />
      <SelectInput
        id={"path-line-dash"}
        label={"Tracejado"}
        options={LINE_DASH_OPTIONS}
        value={pathProps.lineDash}
        disabled={isDisabled || !pathProps.hasStroke}
        onChange={handleChangeLineDash}
      />
      <SliderControl
        id={"path-miter-limit"}
        disabled={isDisabled || !pathProps.hasStroke || pathProps.lineJoin !== "miter"}
        label={"Limite do Miter"}
        min={1}
        max={40}
        step={1}
        value={pathProps.miterLimit}
        onChange={handleChangeMiterLimit}
      />
      <span>
        Status: {pathProps.isClosed ? "Polígono fechado" : "Polilinha aberta"} (
        {pathProps.points.length} pontos)
      </span>
    </section>
  );
};

export default PathMenu;
