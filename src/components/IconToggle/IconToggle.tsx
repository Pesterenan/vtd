import styles from "./IconToggle.module.css";

interface IconToggleProps {
  id: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  uncheckedIcon: string;
  checkedIcon?: string;
}

const IconToggle = ({ id, checked = false, onChange, disabled = false, uncheckedIcon, checkedIcon }: IconToggleProps) => {

  return (
    <div className={styles.container}>
      <input
        id={`${id}_input`}
        className={styles.tglCheckbox}
        disabled={disabled}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label
        id={`${id}_label`}
        htmlFor={`${id}_input`}
        className={styles.tglLabel}
        style={
          {
            "--icon-url": `url("${uncheckedIcon}")`,
            "--checked-icon-url": `url("${checkedIcon}")`,
          } as React.CSSProperties
        }
      />
    </div>
  );
};

export default IconToggle;
