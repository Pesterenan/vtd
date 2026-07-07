import { useEffect, useRef, useState } from "react";
import styles from "./TextMenu.module.css";
import ColorPicker from "../ColorPicker/ColorPicker";
import { useEventBus } from "src/hooks/useEventBus";
import { TextElement } from "../elements/textElement";
import SliderControl from "../SliderControl/SliderControl";

import IconAlignCenter from "src/assets/icons/alignCenter.svg";
import IconAlignLeft from "src/assets/icons/alignLeft.svg";
import IconAlignRight from "src/assets/icons/alignRight.svg";

import IconFontStyleNormal from "src/assets/icons/fontStyleNormal.svg";
import IconFontStyleOverline from "src/assets/icons/fontStyleOverline.svg";
import IconFontStyleStrikeThrough from "src/assets/icons/fontStyleStrikeThrough.svg";
import IconFontStyleUnderline from "src/assets/icons/fontStyleUnderline.svg";

import IconFontWeightBold from "src/assets/icons/fontWeightBold.svg";
import IconFontWeightBoldItalic from "src/assets/icons/fontWeightBoldItalic.svg";
import IconFontWeightItalic from "src/assets/icons/fontWeightItalic.svg";

interface TextMenuState {
  content: string;
  fontSize: number;
  lineHeight: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  hasFill: boolean;
  hasStroke: boolean;
  textAlign: string;
  fontStyle: string;
  fontWeight: string;
}

const DEFAULT_PROPS: TextMenuState = {
  content: "",
  fontSize: 48,
  lineHeight: 1.2,
  fillColor: "#FFFFFF",
  strokeColor: "#000000",
  strokeWidth: 3,
  hasFill: true,
  hasStroke: false,
  textAlign: "center",
  fontStyle: "normal",
  fontWeight: "normal",
};

interface RadioOption {
  value: string;
  icon: string;
  tooltip: string;
}

const TEXT_ALIGN_OPTIONS: RadioOption[] = [
  { value: "left", icon: IconAlignLeft, tooltip: "Esquerda" },
  { value: "center", icon: IconAlignCenter, tooltip: "Centro" },
  { value: "right", icon: IconAlignRight, tooltip: "Direita" },
];

const FONT_STYLE_OPTIONS: RadioOption[] = [
  { value: "normal", icon: IconFontStyleNormal, tooltip: "Sem Linha" },
  { value: "overline", icon: IconFontStyleOverline, tooltip: "Linha acima" },
  {
    value: "strike-through",
    icon: IconFontStyleStrikeThrough,
    tooltip: "Linha através",
  },
  { value: "underline", icon: IconFontStyleUnderline, tooltip: "Linha abaixo" },
];

const FONT_WEIGHT_OPTIONS: RadioOption[] = [
  { value: "normal", icon: IconFontStyleNormal, tooltip: "Normal" },
  { value: "bold", icon: IconFontWeightBold, tooltip: "Negrito" },
  { value: "italic", icon: IconFontWeightItalic, tooltip: "Itálico" },
  {
    value: "bold italic",
    icon: IconFontWeightBoldItalic,
    tooltip: "Negrito e Itálico",
  },
];

interface IconRadioProps {
  option: RadioOption;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const IconRadio = ({ option, name, checked, onChange }: IconRadioProps) => (
  <label className={styles.radioLabel} title={option.tooltip}>
    <input
      type="radio"
      name={name}
      value={option.value}
      checked={checked}
      onChange={onChange}
      className={styles.radioInput}
    />
    <span
      className={styles.radioIcon}
      style={{ "--icon-url": `url("${option.icon}")` } as React.CSSProperties}
    />
  </label>
);

const TextMenu = () => {
  const { on, emit } = useEventBus();
  const [disabled, setDisabled] = useState(true);
  const [selected, setSelected] = useState(false);
  const [textProps, setTextProps] = useState<TextMenuState>(DEFAULT_PROPS);
  const activeElementRef = useRef<TextElement | null>(null);
  const originalContentRef = useRef<string>("");

  useEffect(() => {
    const unsub1 = on("workarea:initialized", () => setDisabled(false));
    const unsub2 = on("workarea:clear", () => {
      setSelected(false);
      setDisabled(true);
      setTextProps(DEFAULT_PROPS);
      activeElementRef.current = null;
    });
    const unsub3 = on("edit:text", () => {
      setSelected(true);
    });
    const unsub4 = on("selection:changed", ({ selectedElements }) => {
      const textElement = selectedElements.find(
        (el) => el instanceof TextElement,
      ) as TextElement | undefined;
      if (textElement) {
        activeElementRef.current = textElement;
        originalContentRef.current = textElement.content.join("\n");
        setSelected(true);
        setTextProps({
          content: textElement.content.join("\n"),
          fontSize: textElement.fontSize,
          lineHeight: textElement.lineHeight,
          fillColor: textElement.fillColor,
          strokeColor: textElement.strokeColor,
          strokeWidth: textElement.strokeWidth,
          hasFill: textElement.hasFill,
          hasStroke: textElement.hasStroke,
          textAlign: textElement.textAlign,
          fontStyle: textElement.fontStyle,
          fontWeight: textElement.fontWeight,
        });
      } else {
        setSelected(false);
        activeElementRef.current = null;
        setTextProps(DEFAULT_PROPS);
      }
    });
    const unsub5 = on("edit:acceptTextChange", () => {
      activeElementRef.current = null;
      setTextProps(DEFAULT_PROPS);
      setSelected(false);
      emit("workarea:selectAt", { firstPoint: null });
      emit("workarea:update");
    });
    const unsub6 = on("edit:declineTextChange", () => {
      if (activeElementRef.current) {
        activeElementRef.current.content = [originalContentRef.current];
      }
      activeElementRef.current = null;
      setTextProps(DEFAULT_PROPS);
      setSelected(false);
      emit("workarea:selectAt", { firstPoint: null });
      emit("workarea:update");
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
    };
  }, [on, emit]);

  const updateProp = <K extends keyof TextMenuState>(
    key: K,
    value: TextMenuState[K],
  ) => {
    setTextProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    updateProp("content", newContent);
    if (activeElementRef.current) {
      activeElementRef.current.content = [newContent];
      emit("workarea:update");
    }
  };

  const handleTextKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      emit("edit:acceptTextChange");
    } else if (event.key === "Escape") {
      event.preventDefault();
      emit("edit:declineTextChange");
    }
  };

  const handleFontSizeChange = (value: number) => {
    updateProp("fontSize", value);
    if (activeElementRef.current) {
      activeElementRef.current.fontSize = value;
      emit("workarea:update");
    }
  };

  const handleLineHeightChange = (value: number) => {
    updateProp("lineHeight", value);
    if (activeElementRef.current) {
      activeElementRef.current.lineHeight = value;
      emit("workarea:update");
    }
  };

  const handleFillColorChange = (color: string) => {
    updateProp("fillColor", color);
    if (activeElementRef.current) {
      activeElementRef.current.fillColor = color;
      emit("workarea:update");
    }
  };

  const handleStrokeColorChange = (color: string) => {
    updateProp("strokeColor", color);
    if (activeElementRef.current) {
      activeElementRef.current.strokeColor = color;
      emit("workarea:update");
    }
  };

  const handleStrokeWidthChange = (value: number) => {
    updateProp("strokeWidth", value);
    if (activeElementRef.current) {
      activeElementRef.current.strokeWidth = value;
      emit("workarea:update");
    }
  };

  const handleHasFillChange = () => {
    const newValue = !textProps.hasFill;
    updateProp("hasFill", newValue);
    if (activeElementRef.current) {
      activeElementRef.current.hasFill = newValue;
      emit("workarea:update");
    }
  };

  const handleHasStrokeChange = () => {
    const newValue = !textProps.hasStroke;
    updateProp("hasStroke", newValue);
    if (activeElementRef.current) {
      activeElementRef.current.hasStroke = newValue;
      emit("workarea:update");
    }
  };

  const handleTextAlignChange =
    (_value: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      updateProp("textAlign", e.target.value);
      if (activeElementRef.current) {
        activeElementRef.current.textAlign = e.target
          .value as TextElement["textAlign"];
        emit("workarea:update");
      }
    };

  const handleFontStyleChange =
    (_value: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      updateProp("fontStyle", e.target.value);
      if (activeElementRef.current) {
        activeElementRef.current.fontStyle = e.target
          .value as TextElement["fontStyle"];
        emit("workarea:update");
      }
    };

  const handleFontWeightChange =
    (_value: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      updateProp("fontWeight", e.target.value);
      if (activeElementRef.current) {
        activeElementRef.current.fontWeight = e.target
          .value as TextElement["fontWeight"];
        emit("workarea:update");
      }
    };

  const isDisabled = disabled || !selected;

  return (
    <section className={styles.section}>
      <div className={styles.titleRow}>
        <h5>Texto:</h5>
        <div className={styles.titleActions}>
          <button
            id="btn_accept-text-changes"
            className={styles.acceptBtn}
            onClick={() => emit("edit:acceptTextChange")}
            disabled={isDisabled}
            title="Aceitar (CTRL+Enter)"
          >
            ✓
          </button>
          <button
            id="btn_decline-text-changes"
            className={styles.declineBtn}
            onClick={() => emit("edit:declineTextChange")}
            disabled={isDisabled}
            title="Descartar (Esc)"
          >
            ✗
          </button>
        </div>
      </div>
      <div className={styles.row}>
        <textarea
          id="inp_text-input"
          className={styles.textarea}
          onChange={handleTextChange}
          onKeyDown={handleTextKeyDown}
          value={textProps.content}
          disabled={isDisabled}
        />
      </div>
      <div className={styles.row}>
        <label htmlFor="font-select">Fonte:</label>
        <select
          id="font-select"
          className={styles.select}
          disabled={isDisabled}
        >
          <option value="" />
        </select>
      </div>
      <div id="div_font-size-line-height" className={styles.row}>
        <SliderControl
          id="font-size-control"
          label="Tamanho"
          min={1}
          max={250}
          step={1}
          value={textProps.fontSize}
          onChange={handleFontSizeChange}
          disabled={isDisabled}
        />
        <SliderControl
          id="line-height-control"
          label="Espaçamento"
          min={0.1}
          max={10}
          step={0.1}
          value={textProps.lineHeight}
          onChange={handleLineHeightChange}
          disabled={isDisabled}
        />
      </div>
      <div className={styles.row}>
        <div id="div_fill-color" className={styles.group}>
          <input
            id="chk_stroke"
            type="checkbox"
            checked={textProps.hasStroke}
            onChange={handleHasStrokeChange}
            disabled={isDisabled}
          />
          <ColorPicker
            id="stroke-color"
            label="Contorno"
            value={textProps.strokeColor}
            disabled={isDisabled || !textProps.hasStroke}
            onChange={handleStrokeColorChange}
          />
          <input
            id="chk_fill"
            type="checkbox"
            checked={textProps.hasFill}
            onChange={handleHasFillChange}
            disabled={isDisabled}
          />
          <ColorPicker
            id="fill-color"
            label="Preench."
            value={textProps.fillColor}
            disabled={isDisabled || !textProps.hasFill}
            onChange={handleFillColorChange}
          />
        </div>
      </div>
      <div className={styles.row}>
        <div id="div_stroke-color" className={styles.group}>
          <SliderControl
            id="stroke-width-control"
            label="Espessura"
            min={1}
            max={128}
            step={1}
            value={textProps.strokeWidth}
            onChange={handleStrokeWidthChange}
            disabled={isDisabled}
          />
          <span>Linha:</span>
          <div id="font-style-container" className={styles.radioGroup}>
            {FONT_STYLE_OPTIONS.map((opt) => (
              <IconRadio
                key={opt.value}
                option={opt}
                name="font-style"
                checked={textProps.fontStyle === opt.value}
                onChange={handleFontStyleChange(opt.value)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className={styles.row}>
        <span>Alinh.:</span>
        <div id="text-align-container" className={styles.radioGroup}>
          {TEXT_ALIGN_OPTIONS.map((opt) => (
            <IconRadio
              key={opt.value}
              option={opt}
              name="text-align"
              checked={textProps.textAlign === opt.value}
              onChange={handleTextAlignChange(opt.value)}
            />
          ))}
        </div>
        <span>Estilo:</span>
        <div id="font-weight-container" className={styles.radioGroup}>
          {FONT_WEIGHT_OPTIONS.map((opt) => (
            <IconRadio
              key={opt.value}
              option={opt}
              name="font-weight"
              checked={textProps.fontWeight === opt.value}
              onChange={handleFontWeightChange(opt.value)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TextMenu;
