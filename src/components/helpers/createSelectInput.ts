export interface ISelectOption {
  label: string;
  value: string;
}
export interface ISelectInput {
  element: HTMLDivElement;
  setValue: (newValue: string) => void;
  setOptions?: (newOptions: {
    optionValues?: ISelectOption[];
    value?: string;
  }) => void;
  getValue: () => string;
  enable: () => void;
  disable: () => void;
}

export default function createSelectInput(
  id: string,
  label: string,
  options: {
    optionValues: Array<ISelectOption>;
    value: ISelectOption["value"];
  },
  onChange: (newValue: string) => void,
): ISelectInput {
  let currentOptions = { ...options };
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

  const renderOptions = () => {
    selectInputEl.innerHTML = "";
    for (const option of currentOptions.optionValues) {
      const optionEl = document.createElement("option");
      optionEl.value = option.value;
      optionEl.innerText = option.label;
      selectInputEl.append(optionEl);
    }
  };

  renderOptions();
  selectInputEl.value = currentOptions.value ?? "";

  const setValue = (newValue: string) => {
    if ([...selectInputEl.options].some((o) => o.value === newValue)) {
      selectInputEl.value = newValue;
    } else {
      selectInputEl.value = selectInputEl.options[0]?.value ?? "";
    }
  };

  const getValue = () => selectInputEl.value;

  const handleInputChange = () => {
    setValue(selectInputEl.value);
    onChange(selectInputEl.value);
  };

  let linked = false;
  const enable = () => {
    if (linked) return;
    linked = true;
    selectInputEl.disabled = false;
    selectInputEl.addEventListener("change", handleInputChange);
  };
  const disable = () => {
    if (!linked) return;
    linked = false;
    selectInputEl.disabled = true;
    selectInputEl.value = selectInputEl.options[0]?.value ?? "";
    selectInputEl.removeEventListener("change", handleInputChange);
  };

  const setOptions = (newOptions: {
    optionValues?: ISelectOption[];
    value?: string;
  }) => {
    currentOptions = { ...currentOptions, ...newOptions };
    renderOptions();
    if (newOptions.value !== undefined) setValue(newOptions.value);
  };

  container.append(labelEl);
  container.append(selectInputEl);

  return {
    element: container,
    setValue,
    setOptions,
    getValue,
    enable,
    disable,
  };
}
