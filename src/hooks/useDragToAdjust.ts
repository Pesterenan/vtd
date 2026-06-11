import { useCallback, useRef } from "react";

const snapToStep = (value: number, min: number, max: number, step: number): number => {
  const clamped = Math.min(max, Math.max(min, value));
  const steps = Math.round((clamped - min) / step);
  return min + steps * step;
};

const useDragToAdjust = ({ min, max, step, value, onChange, sensitivity = 2000 }: {
  min: number; max: number; step: number; value: number; onChange: (v: number) => void; sensitivity?: number;
}) => {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startValue = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startValue.current = value;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const valueRange = max - min;
      const deltaValue = ((ev.clientX - startX.current) / sensitivity) * valueRange;
      const newValue = snapToStep(startValue.current + deltaValue, min, max, step);
      onChange(newValue);
    };

    const preventClick = (ev: MouseEvent) => {
      ev.stopPropagation();
      ev.preventDefault();
      window.removeEventListener("click", preventClick, true);
    };

    const handleMouseUp = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      ev.stopPropagation();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp, true);
      window.removeEventListener("click", preventClick, true);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp, true);
    window.addEventListener("click", preventClick, true);
  }, [min, max, step, value, onChange, sensitivity]);

  return { onMouseDown };
};

export default useDragToAdjust;
