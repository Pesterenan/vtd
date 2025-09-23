import { clamp } from "src/utils/easing";
export interface ISliderControl {
  element: HTMLDivElement;
  setValue: (newValue: string | number) => void;
  setOptions: (newOptions: {
    min?: number;
    max?: number;
    step?: number;
  }) => void;
  getValue: () => number;
  enable: () => void;
  disable: () => void;
}

export default function createSliderControl(
  id: string,
  label: string,
  initialOptions: { min: number; max: number; step: number; value: number },
  onChange: (newValue: number) => void,
  includeSlider = true,
): ISliderControl {
  let options = { ...initialOptions };

  const getDecimalPlaces = () => {
    const parts = options.step.toString().split(".");
    return parts[1]?.length ?? 0;
  };

  const snapToStep = (v: number) => {
    const step = options.step;
    const snapped = Math.round((v - options.min) / step) * step + options.min;
    // fix floating precision
    const dp = getDecimalPlaces();
    return Number(clamp(Number(snapped.toFixed(dp)), options.min, options.max));
  };

  const clamped = (value: number | string): string =>
    snapToStep(Number(value)).toFixed(getDecimalPlaces());

  const container = document.createElement("div");
  container.className = "container ai-c jc-sb g-05";
  const labelEl = document.createElement("label");
  labelEl.id = `${id}-label`;
  labelEl.innerText = `${label}:`;
  labelEl.style.cursor = "ew-resize";
  labelEl.style.userSelect = "none";
  const sliderEl = document.createElement("input");
  sliderEl.id = `${id}-slider`;
  sliderEl.type = "range";
  sliderEl.min = options.min.toString();
  sliderEl.max = options.max.toString();
  sliderEl.step = options.step.toString();
  sliderEl.value = clamped(options.value);

  const inputFieldEl = document.createElement("input");
  inputFieldEl.id = `${id}-input`;
  inputFieldEl.type = "number";
  inputFieldEl.min = options.min.toString();
  inputFieldEl.max = options.max.toString();
  inputFieldEl.step = options.step.toString();
  inputFieldEl.value = clamped(options.value);
  inputFieldEl.style.width = "4rem";

  const getValue = () => Number(inputFieldEl.value);

  const setValue = (newValue: string | number) => {
    const v = clamped(newValue);
    sliderEl.value = v;
    inputFieldEl.value = v;
  };

  const setOptions = (newOptions: {
    min?: number;
    max?: number;
    step?: number;
  }) => {
    options = { ...options, ...newOptions };
    // atualizar atributos do input
    sliderEl.min = options.min.toString();
    sliderEl.max = options.max.toString();
    sliderEl.step = options.step.toString();
    inputFieldEl.min = options.min.toString();
    inputFieldEl.max = options.max.toString();
    inputFieldEl.step = options.step.toString();
    // reaplicar value clamped (mantém coerência com novo range/step)
    setValue(inputFieldEl.value);
  };

  const handleSliderChange = () => {
    setValue(sliderEl.value);
    onChange(Number(clamped(sliderEl.value)));
  };
  const handleInputChange = () => {
    setValue(inputFieldEl.value);
    onChange(Number(clamped(inputFieldEl.value)));
  };

  let isDragging = false;
  let startX = 0;
  let startValue = 0;

  const handleMouseDown = (evt: MouseEvent) => {
    evt.stopPropagation();
    isDragging = true;
    startX = evt.clientX;
    startValue = Number(sliderEl.value);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (evt: MouseEvent) => {
    if (!isDragging) return;
    // converte deltaX (px) em deltaValue proporcional à largura do slider
    const sliderWidth = sliderEl.clientWidth || 100; // fallback
    const deltaX = evt.clientX - startX;
    const valueRange = options.max - options.min;
    const deltaValue = (deltaX / sliderWidth) * valueRange;
    const newValue = snapToStep(startValue + deltaValue);
    setValue(newValue);
    onChange(newValue);
  };

  const handleMouseUp = (evt: MouseEvent) => {
    evt.stopPropagation();
    if (isDragging) {
      isDragging = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
  };

  let linked = false;
  const enable = () => {
    if (linked) return;
    linked = true;
    sliderEl.disabled = false;
    sliderEl.addEventListener("input", handleSliderChange);
    inputFieldEl.disabled = false;
    inputFieldEl.addEventListener("change", handleInputChange);
    labelEl.addEventListener("mousedown", handleMouseDown);
  };
  const disable = () => {
    if (!linked) return;
    linked = false;
    sliderEl.disabled = true;
    sliderEl.removeEventListener("input", handleSliderChange);
    inputFieldEl.disabled = true;
    inputFieldEl.removeEventListener("change", handleInputChange);
    labelEl.removeEventListener("mousedown", handleMouseDown);
    // garantir remoção dos listeners de window se estiverem presentes
    if (isDragging) {
      isDragging = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    sliderEl.value = String(options.min) || "0";
    inputFieldEl.value = String(options.min) || "0";
  };

  container.append(labelEl);
  includeSlider && container.append(sliderEl);
  container.append(inputFieldEl);

  return {
    element: container,
    setValue,
    setOptions,
    getValue,
    enable,
    disable,
  };
}
