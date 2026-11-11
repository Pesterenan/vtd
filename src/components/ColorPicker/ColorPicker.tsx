import { useRef } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import styles from "./ColorPicker.module.css";

export interface ColorPickerProps {
  id: string;
  label: string;
  value?: string;
  disabled?: boolean;
  onChange: (color: string) => void;
}

const ColorPicker = ({
  id,
  label,
  value = "#000000",
  disabled = false,
  onChange,
}: ColorPickerProps) => {
  const { emit } = useEventBus();
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Abre o seletor de cores da aplicação no lugar do picker nativo. O
   * `preventDefault` no `mousedown` e no `click` impede o navegador de abrir o
   * diálogo nativo do `input[type="color"]`.
   */
  const openPicker = (event: React.SyntheticEvent<HTMLInputElement>) => {
    if (disabled) return;
    event.preventDefault();
    emit("colorPicker:open", {
      anchor: inputRef.current ?? event.currentTarget,
      color: value,
      onChange,
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={styles.container}>
      <label
        id={`${id}-label`}
        htmlFor={`${id}-color-input`}
        style={{ userSelect: "none" }}
      >
        {label}:
      </label>
      <input
        ref={inputRef}
        id={`${id}-color-input`}
        className={styles.input}
        disabled={disabled}
        type="color"
        onChange={handleChange}
        onMouseDown={(event) => event.preventDefault()}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") openPicker(event);
        }}
        value={value}
      />
    </div>
  );
};

export default ColorPicker;
