import useElementMenu from "src/hooks/useElementMenu";
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
  const {
    disabled,
    selected,
    state: pathProps,
    bindProp,
  } = useElementMenu<PathElement, PathMenuState>({
    defaultState: DEFAULT_PROPS,
    findSelected: (els) => els.find((el) => el instanceof PathElement),
    syncFromElement: (el) => ({
      fillColor: el.fillColor,
      hasFill: el.hasFill,
      hasStroke: el.hasStroke,
      isClosed: el.isClosed,
      lineCap: el.lineCap,
      lineDash: el.lineDash,
      lineJoin: el.lineJoin,
      miterLimit: el.miterLimit,
      points: el.points,
      strokeColor: el.strokeColor,
      strokeWidth: el.strokeWidth,
    }),
  });

  const handleToggleFill = bindProp("hasFill", (el, checked) => {
    el.hasFill = checked;
  });

  const handleToggleStroke = bindProp("hasStroke", (el, checked) => {
    el.hasStroke = checked;
  });

  const handleChangeStrokeColor = bindProp("strokeColor", (el, color) => {
    el.strokeColor = color;
  });

  const handleChangeFillColor = bindProp("fillColor", (el, color) => {
    el.fillColor = color;
  });

  const handleChangeStrokeWidth = bindProp("strokeWidth", (el, value) => {
    el.strokeWidth = value;
  });

  const handleChangeLineCap = (value: string) => {
    const lineCap = value as PathMenuState["lineCap"];
    bindProp("lineCap", (el, cap) => {
      el.lineCap = cap;
    })(lineCap);
  };

  const handleChangeLineJoin = (value: string) => {
    const lineJoin = value as PathMenuState["lineJoin"];
    bindProp("lineJoin", (el, join) => {
      el.lineJoin = join;
    })(lineJoin);
  };

  const handleChangeLineDash = (value: string) => {
    const lineDash = value as PathMenuState["lineDash"];
    bindProp("lineDash", (el, dash) => {
      el.lineDash = dash;
    })(lineDash);
  };

  const handleChangeMiterLimit = bindProp("miterLimit", (el, value) => {
    el.miterLimit = value;
  });

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
