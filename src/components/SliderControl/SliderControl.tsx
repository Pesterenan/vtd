import { useRef } from "react";
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
}

const SliderControl = ({
  id, label, min, max, step, value, onChange, includeSlider, disabled
}: SliderControlProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { onMouseDown: dragHandlers } = useDragToAdjust({ min, max, step, value, onChange });

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className={styles.container}>
      <label
        id={`${id}-label`}
        className={styles.label}
        onMouseDown={dragHandlers}
      >
        {label}:
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
      <input
        id={`${id}-input`}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        className={styles.numberInput}
      />
    </div>
  );
};

export default SliderControl;
