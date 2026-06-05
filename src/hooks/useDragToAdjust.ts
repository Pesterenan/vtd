import { useCallback, useRef } from "react";

const snapToStep = (value: number, min: number, max: number, step: number): number => {
  const clamped = Math.min(max, Math.max(min, value));
  const steps = Math.round((clamped - min) / step);
  return min + steps * step;
};

const useDragToAdjust = ({ min, max, step, value, onChange }: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void;
}) => {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startValue = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isDragging.current = true;
    startX.current = e.clientX;
    startValue.current = value;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const valueRange = max - min;
      const deltaValue = ((ev.clientX - startX.current) / 100) * valueRange;
      const newValue = snapToStep(startValue.current + deltaValue, min, max, step);
      onChange(newValue);
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [min, max, step, value, onChange]);

  return { onMouseDown };
};

export default useDragToAdjust;
