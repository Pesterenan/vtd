import styles from "./TextInput.module.css";

interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
}

const TextInput = ({
  id, label, value, onChange, minLength, maxLength, disabled,
}: TextInputProps) => {
  return (
    <div className={styles.container}>
      <label id={`${id}-label`} className={styles.label}>{label}:</label>
      <input
        id={`${id}-input`}
        type="text"
        className={styles.input}
        value={value}
        minLength={minLength}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default TextInput;
