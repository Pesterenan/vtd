import type { ISelectOption } from "../types";

export interface ISelectInput {
  element: HTMLDivElement;
  updateValues: (newValue: string) => void;
  linkEvents: () => void;
  unlinkEvents: () => void;
}

export default function createSelectInput(
  id: string,
  label: string,
  options: { optionValues: Array<ISelectOption>; value: ISelectOption['value'] },
  onChange: (newValue: string) => void,
): ISelectInput {
  const container = document.createElement("div");
  container.className = "container ai-c jc-sb g-05";
  const labelEl = document.createElement("label");
  labelEl.id = `${id}-label`;
  labelEl.innerText = `${label}:`;
  labelEl.style.userSelect = "none";
  labelEl.htmlFor = `${id}-select-input`;

  const selectInputEl = document.createElement("select");
  selectInputEl.id = `${id}-select-input`;
  selectInputEl.style.width = "8rem";
  for (const option of options.optionValues) {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.innerText = option.label;
    selectInputEl.append(optionEl);
  }
  selectInputEl.value = options.value;

  const updateValues = (newValue: string) => {
    selectInputEl.value = newValue;
  };

  const handleInputChange = () => {
    updateValues(selectInputEl.value);
    onChange(selectInputEl.value);
  };

  const linkEvents = () => {
    selectInputEl.disabled = false;
    selectInputEl.addEventListener("change", handleInputChange);
  };
  const unlinkEvents = () => {
    selectInputEl.disabled = true;
    selectInputEl.value = "";
    selectInputEl.removeEventListener("change", handleInputChange);
  };

  container.append(labelEl);
  container.append(selectInputEl);

  return {
    element: container,
    updateValues,
    linkEvents,
    unlinkEvents,
  };
}
