export default function createIconRadioButton(
  iconSrc: string,
  id: string,
  name: string,
  tooltipTitle: string,
  value: string,
  checked = false,
): HTMLDivElement {
  const container = document.createElement("div");
  const radioButton = document.createElement("input");
  radioButton.id = id;
  radioButton.className = "tgl-common";
  radioButton.checked = checked;
  radioButton.name = name;
  radioButton.type = "radio";
  radioButton.value = value;
  const tooltip = document.createElement("tooltip");
  tooltip.title = tooltipTitle;
  const label = document.createElement("label");
  label.htmlFor = id;
  label.style.setProperty("--icon-url", `url(${iconSrc})`);
  label.style.setProperty("--checked-icon-url", `url(${iconSrc})`);
  tooltip.append(radioButton, label);
  container.append(tooltip);
  return container;
}
