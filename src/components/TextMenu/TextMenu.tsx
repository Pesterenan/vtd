import { useEffect, useRef, useState } from 'react';
import styles from './TextMenu.module.css';
import ColorPicker from '../ColorPicker/ColorPicker';
import { useEventBus } from 'src/hooks/useEventBus';
import { TextElement } from '../elements/textElement';
import SliderControl from '../SliderControl/SliderControl';

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
  content: '',
  fontSize: 48,
  lineHeight: 1.2,
  fillColor: '#FFFFFF',
  strokeColor: '#000000',
  strokeWidth: 3,
  hasFill: true,
  hasStroke: false,
  textAlign: 'center',
  fontStyle: 'normal',
  fontWeight: 'normal',
};

const TextMenu = () => {
  const { on, emit } = useEventBus();
  const [disabled, setDisabled] = useState(true);
  const [selected, setSelected] = useState(false);
  const [textProps, setTextProps] = useState<TextMenuState>(DEFAULT_PROPS);
  const activeElementRef = useRef<TextElement | null>(null);

  useEffect(() => {
    const unsub1 = on("workarea:initialized", () => setDisabled(false));
    const unsub2 = on("workarea:clear", () => {
      setSelected(false);
      setDisabled(true);
      activeElementRef.current = null;
    });
    const unsub3 = on("edit:text", () => {
      setSelected(true);
    });
    const unsub4 = on("selection:changed", ({ selectedElements }) => {
      const textElement = selectedElements.find(
        el => el instanceof TextElement,
      ) as TextElement | undefined;
      if (textElement) {
        activeElementRef.current = textElement;
        setSelected(true);
        setTextProps({
          content: textElement.content.join(''),
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
      }
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [on]);

  const updateProp = <K extends keyof TextMenuState>(
    key: K,
    value: TextMenuState[K],
  ) => {
    setTextProps(prev => ({ ...prev, [key]: value }));
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    updateProp('content', newContent);
    if (activeElementRef.current) {
      activeElementRef.current.content = [newContent];
      emit("workarea:update");
    }
  };

  const handleFontSizeChange = (value: number) => {
    updateProp('fontSize', value);
    if (activeElementRef.current) {
      activeElementRef.current.fontSize = value;
      emit("workarea:update");
    }
  };

  const handleLineHeightChange = (value: number) => {
    updateProp('lineHeight', value);
    if (activeElementRef.current) {
      activeElementRef.current.lineHeight = value;
      emit("workarea:update");
    }
  };

  const handleFillColorChange = (color: string) => {
    updateProp('fillColor', color);
    if (activeElementRef.current) {
      activeElementRef.current.fillColor = color;
      emit("workarea:update");
    }
  };

  const handleStrokeColorChange = (color: string) => {
    updateProp('strokeColor', color);
    if (activeElementRef.current) {
      activeElementRef.current.strokeColor = color;
      emit("workarea:update");
    }
  };

  const handleStrokeWidthChange = (value: number) => {
    updateProp('strokeWidth', value);
    if (activeElementRef.current) {
      activeElementRef.current.strokeWidth = value;
      emit("workarea:update");
    }
  };

  const handleHasFillChange = () => {
    const newValue = !textProps.hasFill;
    updateProp('hasFill', newValue);
    if (activeElementRef.current) {
      activeElementRef.current.hasFill = newValue;
      emit("workarea:update");
    }
  };

  const handleHasStrokeChange = () => {
    const newValue = !textProps.hasStroke;
    updateProp('hasStroke', newValue);
    if (activeElementRef.current) {
      activeElementRef.current.hasStroke = newValue;
      emit("workarea:update");
    }
  };

  const handleTextAlignChange = (value: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateProp('textAlign', e.target.value);
    if (activeElementRef.current) {
      activeElementRef.current.textAlign = e.target.value as TextElement['textAlign'];
      emit("workarea:update");
    }
  };

  const handleFontStyleChange = (value: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateProp('fontStyle', e.target.value);
    if (activeElementRef.current) {
      activeElementRef.current.fontStyle = e.target.value as TextElement['fontStyle'];
      emit("workarea:update");
    }
  };

  const handleFontWeightChange = (value: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    updateProp('fontWeight', e.target.value);
    if (activeElementRef.current) {
      activeElementRef.current.fontWeight = e.target.value as TextElement['fontWeight'];
      emit("workarea:update");
    }
  };

  const isDisabled = disabled || !selected;

  return (
    <section className={styles.section} aria-disabled={isDisabled || undefined}>
      <h5>Texto:</h5>
      <div className={styles.row}>
        <textarea
          id="inp_text-input"
          className={styles.textarea}
          onChange={handleTextChange}
          value={textProps.content}
        />
      </div>
      <div className={styles.row}>
        <label htmlFor="font-select">Fonte:</label>
        <select id="font-select" className={styles.select}>
          <option value="" />
        </select>
      </div>
      <div id="div_font-size-line-height" className={styles.row}>
        <SliderControl
          id="font-size-control"
          label="Tamanho"
          min={1} max={250} step={1}
          value={textProps.fontSize}
          onChange={handleFontSizeChange}
        />
        <SliderControl
          id="line-height-control"
          label="Espaçamento"
          min={0.1} max={10} step={0.1}
          value={textProps.lineHeight}
          onChange={handleLineHeightChange}
        />
      </div>
      <div className={styles.row}>
        <div id="div_fill-color" className={styles.group}>
          <input
            id="chk_fill"
            type="checkbox"
            checked={textProps.hasFill}
            onChange={handleHasFillChange}
          />
          <ColorPicker
            id="fill-color"
            label="Preenchimento"
            value={textProps.fillColor}
            disabled={!textProps.hasFill}
            onChange={handleFillColorChange}
          />
        </div>
      </div>
      <div className={styles.row}>
        <div id="div_stroke-color" className={styles.group}>
          <input
            id="chk_stroke"
            type="checkbox"
            checked={textProps.hasStroke}
            onChange={handleHasStrokeChange}
          />
          <ColorPicker
            id="stroke-color"
            label="Contorno"
            value={textProps.strokeColor}
            disabled={!textProps.hasStroke}
            onChange={handleStrokeColorChange}
          />
          <SliderControl
            id="stroke-width-control"
            label="Espessura"
            min={1} max={128} step={1}
            value={textProps.strokeWidth}
            onChange={handleStrokeWidthChange}
          />
        </div>
      </div>
      <div className={styles.row}>
        <span>Centralizar:</span>
        <div id="text-align-container" className={styles.radioGroup}>
          {['left', 'center', 'right'].map(align => (
            <label key={align} className={styles.radioLabel}>
              <input
                type="radio"
                name="text-align"
                value={align}
                checked={textProps.textAlign === align}
                onChange={handleTextAlignChange(align)}
                className={styles.radioInput}
              />
              <span>{align}</span>
            </label>
          ))}
        </div>
        <span>Linha:</span>
        <div id="font-style-container" className={styles.radioGroup}>
          {['normal', 'overline', 'strike-through', 'underline'].map(style => (
            <label key={style} className={styles.radioLabel}>
              <input
                type="radio"
                name="font-style"
                value={style}
                checked={textProps.fontStyle === style}
                onChange={handleFontStyleChange(style)}
                className={styles.radioInput}
              />
              <span>{style}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={`${styles.row} ${styles.rowEnd}`}>
        <span>Estilo:</span>
        <div id="font-weight-container" className={styles.radioGroup}>
          {['normal', 'bold', 'italic', 'bold italic'].map(weight => (
            <label key={weight} className={styles.radioLabel}>
              <input
                type="radio"
                name="font-weight"
                value={weight}
                checked={textProps.fontWeight === weight}
                onChange={handleFontWeightChange(weight)}
                className={styles.radioInput}
              />
              <span>{weight}</span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TextMenu;
