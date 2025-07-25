export interface ITextInput {
  element: HTMLDivElement;
  updateValues: (newValue: string) => void;
  linkEvents: () => void;
  unlinkEvents: () => void;
}

export default function createTextInput(
  id: string,
  label: string,
  options: { min: number; max: number },
  onChange: (newValue: string) => void,
): ITextInput {
  const container = document.createElement("div");
  container.className = "container ai-c jc-sb g-05";
  const labelEl = document.createElement("label");
  labelEl.id = `${id}-label`;
  labelEl.innerText = `${label}:`;
  labelEl.style.userSelect = "none";

  const inputFieldEl = document.createElement("input");
  inputFieldEl.id = `${id}-input`;
  inputFieldEl.type = "text";
  inputFieldEl.minLength = options.min;
  inputFieldEl.maxLength = options.max;
  inputFieldEl.style.width = "4rem";

  const updateValues = (newValue: string) => {
    inputFieldEl.value = newValue;
  };

  const handleInputChange = () => {
    updateValues(inputFieldEl.value);
    onChange(inputFieldEl.value);
  };

  const linkEvents = () => {
    inputFieldEl.disabled = false;
    inputFieldEl.addEventListener("change", handleInputChange);
  };
  const unlinkEvents = () => {
    inputFieldEl.disabled = true;
    inputFieldEl.value = "";
    inputFieldEl.removeEventListener("change", handleInputChange);
  };

  container.append(labelEl);
  container.append(inputFieldEl);

  return {
    element: container,
    updateValues,
    linkEvents,
    unlinkEvents,
  };
}
