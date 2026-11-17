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

/** Janela em que um `click` sintetizado pelo teclado é ignorado. */
export const DUPLICATE_OPEN_WINDOW_MS = 100;

const ColorPicker = ({
  id,
  label,
  value = "#000000",
  disabled = false,
  onChange,
}: ColorPickerProps) => {
  const { emit } = useEventBus();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastOpenAt = useRef(0);

  /**
   * Abre o seletor de cores da aplicação no lugar do picker nativo. O
   * `preventDefault` no `mousedown` e no `click` impede o navegador de abrir o
   * diálogo nativo do `input[type="color"]`.
   *
   * Enter/espaço disparam `keydown` e podem sintetizar um `click` em seguida;
   * a janela curta evita abrir o mesmo painel duas vezes.
   */
  const openPicker = (event: React.SyntheticEvent<HTMLInputElement>) => {
    if (disabled) return;
    event.preventDefault();
    const now = Date.now();
    if (now - lastOpenAt.current < DUPLICATE_OPEN_WINDOW_MS) return;
    lastOpenAt.current = now;
    emit("colorPicker:open", {
      anchor: inputRef.current ?? event.currentTarget,
      color: value,
      onChange,
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === " ") openPicker(event);
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
        readOnly
        type="color"
        onMouseDown={(event) => event.preventDefault()}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        value={value}
      />
    </div>
  );
};

export default ColorPicker;
