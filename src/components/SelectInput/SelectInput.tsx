import { OPTION_SEPARATOR_VALUE } from "src/constants";
import styles from "./SelectInput.module.css";

export interface ISelectOption {
  label: string;
  value: string;
}

interface SelectInputProps {
  /** Component id */
  id: string;
  /** Label to be displayed */
  label: string;
  /** Array of @see `ISelectOption` */
  options: ISelectOption[];
  /** Controlled value */
  value: string;
  /** onChange handler for controlled value */
  onChange: (value: string) => void;
  /** Disables the component */
  disabled?: boolean;
}

/** SelectInput component
  * @param {SelectInputProps} props -  Component props */
const SelectInput = ({
  id, label, options, value, onChange, disabled,
}: SelectInputProps) => {
  return (
    <div className={styles.container}>
      <label id={`${id}-label`} className={styles.label}>{label}:</label>
      <select
        id={`${id}-select-input`}
        className={styles.select}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value === OPTION_SEPARATOR_VALUE ? "" : opt.value}
            disabled={opt.value === OPTION_SEPARATOR_VALUE}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectInput;
