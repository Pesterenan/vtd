import { clamp } from "src/utils/easing";

export interface ISliderControl {
  element: HTMLDivElement;
  updateValue: (newValue: number) => void;
  linkEvents: () => void;
  unlinkEvents: () => void;
}

export function createSliderControl(
  id: string,
  label: string,
  options: { min: number; max: number; step: number; value: number },
  onChange: (newValue: number) => void,
): ISliderControl {
  const decimalPlaces = options.step.toString().split(".")[1]?.length || 0;
  const clampedValue = clamp(options.value, options.min, options.max).toFixed(
    decimalPlaces,
  );
  const container = document.createElement("div");
  container.className = "container ai-c jc-sb g-05";
  const labelEl = document.createElement("label");
  labelEl.id = `${id}-label`;
  labelEl.innerText = `${label}:`;
  labelEl.style.cursor = "ew-resize";
  const sliderEl = document.createElement("input");
  sliderEl.id = `${id}-slider`;
  sliderEl.type = "range";
  sliderEl.min = options.min.toString();
  sliderEl.max = options.max.toString();
  sliderEl.step = options.step.toString();
  sliderEl.value = clampedValue;

  const inputFieldEl = document.createElement("input");
  inputFieldEl.type = "number";
  inputFieldEl.min = options.min.toString();
  inputFieldEl.max = options.max.toString();
  inputFieldEl.step = options.step.toString();
  inputFieldEl.value = clampedValue;
  inputFieldEl.style.width = '4rem';

  const updateValues = (newValue: string) => {
    const clamped = clamp(Number(newValue), options.min, options.max).toFixed(
      decimalPlaces,
    );
    sliderEl.value = clamped;
    inputFieldEl.value = clamped;
    onChange(Number(clamped));
  };

  const handleSliderChange = () => updateValues(sliderEl.value);
  const handleInputChange = () => updateValues(inputFieldEl.value);

  let isDragging = false;
  let startX = 0;
  let startValue = 0;

  const handleMouseDown = (evt: MouseEvent) => {
    isDragging = true;
    startX = evt.clientX;
    startValue = Number(sliderEl.value);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (evt: MouseEvent) => {
    if (isDragging) {
      const deltaX = evt.clientX - startX;
      const newValue = clamp(
        startValue + deltaX * options.step,
        options.min,
        options.max,
      );
      updateValues(newValue.toString());
    }
  };

  const handleMouseUp = () => {
    isDragging = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  const linkEvents = () => {
    sliderEl.disabled = false;
    sliderEl.addEventListener("input", handleSliderChange);
    inputFieldEl.disabled = false;
    inputFieldEl.addEventListener("input", handleInputChange);
    labelEl.addEventListener("mousedown", handleMouseDown);
  };
  const unlinkEvents = () => {
    sliderEl.disabled = true;
    sliderEl.value = "0";
    sliderEl.removeEventListener("input", handleSliderChange);
    inputFieldEl.disabled = true;
    inputFieldEl.value = "0";
    inputFieldEl.removeEventListener("input", handleInputChange);
    labelEl.removeEventListener("mousedown", handleMouseDown);
  };

  container.append(labelEl, sliderEl, inputFieldEl);

  return {
    element: container,
    updateValue: (newValue: number) => updateValues(newValue.toString()),
    linkEvents,
    unlinkEvents,
  };
}
