import { useRef, useState } from "react";
import useDragToAdjust from "src/hooks/useDragToAdjust";
import styles from "./SliderControl.module.css";

interface SliderControlProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  includeSlider?: boolean;
  disabled?: boolean;
  /** Unidade exibida ao lado do campo, como `%` ou `°`. */
  suffix?: string;
  /** Layout estreito, para barras de ferramentas pequenas. */
  compact?: boolean;
}

const SliderControl = ({
  id, label, min, max, step, value, onChange, includeSlider, disabled,
  suffix, compact,
}: SliderControlProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const { onMouseDown: dragHandlers } = useDragToAdjust({ min, max, step, value, onChange });

  const clamp = (candidate: number) => Math.min(max, Math.max(min, candidate));

  const parseNumber = (raw: string): number => Number(raw.replace(",", "."));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  /**
   * O texto fica em estado local enquanto o campo está em edição: assim o
   * usuário pode apagar o conteúdo e digitar por substituição (um input
   * controlado restauraria o valor antigo). Valores válidos são aplicados
   * imediatamente; texto inválido ou vazio espera o blur.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraft(raw);
    if (raw.trim() === "") return;
    const parsed = parseNumber(raw);
    if (Number.isNaN(parsed)) return;
    onChange(clamp(parsed));
  };

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = parseNumber(draft);
    if (draft.trim() !== "" && !Number.isNaN(parsed)) onChange(clamp(parsed));
    setDraft(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitDraft();
    if (e.key === "Escape") setDraft(null);
  };

  /**
   * O campo é numérico, então o navegador descarta uma unidade digitada. Num
   * texto colado (`45°`, `50%`) preservamos só o número em vez de esvaziar o
   * campo.
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!suffix) return;
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted.endsWith(suffix)) return;

    const raw = pasted.slice(0, -suffix.length).trim();
    const numeric = Number(raw.replace(",", "."));
    if (raw === "" || Number.isNaN(numeric)) return;

    e.preventDefault();
    onChange(clamp(numeric));
  };

  return (
    <div
      className={`${styles.container}${compact ? ` ${styles.containerCompact}` : ""}`}
    >
      <label
        id={`${id}-label`}
        htmlFor={`${id}-input`}
        className={`${styles.label}${compact ? ` ${styles.labelCompact}` : ""}`}
        onMouseDown={disabled ? undefined : dragHandlers}
        style={{ cursor: disabled ? "default" : undefined }}
      >
        {compact ? label : `${label}:`}
      </label>
      {includeSlider && (
        <input
          id={`${id}-slider`}
          type="range"
          ref={inputRef}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          disabled={disabled}
        />
      )}
      <div className={styles.inputWrap}>
        <input
          id={`${id}-input`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={draft ?? value}
          onChange={handleInputChange}
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          className={`${styles.numberInput}${compact ? ` ${styles.numberInputCompact}` : ""}${suffix ? ` ${styles.numberInputWithSuffix}` : ""}`}
        />
        {suffix && (
          <span className={styles.suffix} aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

export default SliderControl;
