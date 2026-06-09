import { useRef } from "react";
import styles from "./CheckboxInput.module.css";

interface CheckboxInputProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const CheckboxInput = ({ id, label, checked = false, onChange, disabled = false }: CheckboxInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCustomClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div className={styles.container}>
      <label id={`${id}-label`} htmlFor={`${id}-checkbox-input`} className={styles.label}>
        {label}:
      </label>
      <input
        ref={inputRef}
        id={`${id}-checkbox-input`}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.hiddenCheckbox}
      />
      <span className={styles.customCheckbox} aria-hidden="true" onClick={handleCustomClick} />
    </div>
  );
};

export default CheckboxInput;
