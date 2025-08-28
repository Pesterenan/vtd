export interface ICheckboxControl {
  element: HTMLDivElement;
  updateValue: (newValue: boolean) => void;
  linkEvents: () => void;
  unlinkEvents: () => void;
}

export default function createCheckboxControl(
  id: string,
  label: string,
  options: { value: boolean, tooltip?: string },
  onChange: (newValue: boolean) => void,
): ICheckboxControl {
  const container = document.createElement("div");
  container.className = "container ai-c";
  container.style.height = "1.5rem";

  const labelEl = document.createElement("label");
  labelEl.id = `${id}-label`;
  labelEl.htmlFor = `${id}-checkbox-input`;
  labelEl.innerText = `${label}`;
  labelEl.style.userSelect = "none";
  labelEl.style.cursor = "pointer";

  const hiddenCheckbox = document.createElement("input");
  hiddenCheckbox.id = `${id}-checkbox-input`;
  hiddenCheckbox.type = "checkbox";
  hiddenCheckbox.checked = options.value;
  hiddenCheckbox.className = "hidden-checkbox";

  const customCheckbox = document.createElement("span");
  customCheckbox.className = "custom-checkbox";
  customCheckbox.setAttribute("aria-hidden", "true");

  const updateValue = (newValue: boolean) => {
    hiddenCheckbox.checked = newValue;
  };

  const handleInputChange = () => {
    onChange(hiddenCheckbox.checked);
  };

  const handleCustomCheckboxClick = () => {
    hiddenCheckbox.click();
  };

  const linkEvents = () => {
    hiddenCheckbox.disabled = false;
    hiddenCheckbox.addEventListener("change", handleInputChange);
    customCheckbox.addEventListener("click", handleCustomCheckboxClick);
  };

  const unlinkEvents = () => {
    hiddenCheckbox.disabled = true;
    hiddenCheckbox.removeEventListener("change", handleInputChange);
    customCheckbox.removeEventListener("click", handleCustomCheckboxClick);
  };

  if (options.tooltip) {
    const tooltip = document.createElement("tooltip");
    tooltip.title = options.tooltip;
    tooltip.append(labelEl);
    container.append(hiddenCheckbox, customCheckbox, tooltip);
  } else {
    container.append(hiddenCheckbox, customCheckbox, labelEl);
  }

  return {
    element: container,
    updateValue,
    linkEvents,
    unlinkEvents,
  };
}
