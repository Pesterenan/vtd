import styles from "./ColorPicker.module.css";

export interface ColorPickerProps {
  id: string;
  label: string;
  value?: string;
  disabled?: boolean;
  onChange: (color: string) => void;
}

const ColorPicker = ({ id, label, value = "#000000", disabled = false, onChange }: ColorPickerProps) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={styles.container}>
      <label id={`${id}-label`} htmlFor={`${id}-color-input`} style={{ userSelect: "none" }}>
        {label}:
      </label>
      <input
        id={`${id}-color-input`}
        disabled={disabled}
        type="color"
        onChange={handleChange}
        value={value}
      />
    </div>
  );
};

export default ColorPicker;
