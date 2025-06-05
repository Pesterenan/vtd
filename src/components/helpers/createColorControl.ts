export interface IColorControl {
  element: HTMLDivElement;
  updateValue: (newValue: string) => void;
  linkEvents: () => void;
  unlinkEvents: () => void;
}

export default function createColorControl(
  id: string,
  label: string,
  options: { value: string },
  onChange: (newValue: string) => void,
): IColorControl {
  const container = document.createElement("div");
  container.className = "container ai-c jc-sb g-05";
  const labelEl = document.createElement("label");
  labelEl.id = `${id}-label`;
  labelEl.htmlFor = `${id}-color-input`;
  labelEl.innerText = `${label}:`;
  labelEl.style.userSelect = "none";
  const inputFieldEl = document.createElement("input");
  inputFieldEl.id = `${id}-color-input`;
  inputFieldEl.type = "color";
  inputFieldEl.value = options.value;

  const updateValues = (newValue: string) => {
    inputFieldEl.value = newValue;
    onChange(newValue);
  };

  const handleInputChange = () => updateValues(inputFieldEl.value);
  const linkEvents = () =>
    inputFieldEl.addEventListener("input", handleInputChange);
  const unlinkEvents = () =>
    inputFieldEl.removeEventListener("input", handleInputChange);

  container.append(labelEl, inputFieldEl);

  return {
    element: container,
    updateValue: (newValue: string) => updateValues(newValue),
    linkEvents,
    unlinkEvents,
  };
}
