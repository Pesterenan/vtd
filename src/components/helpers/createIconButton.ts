export default function createIconButton(
  id: string,
  tooltipTitle: string,
  iconSrc: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = id;
  button.className = "btn-common";
  const tooltip = document.createElement("tooltip");
  tooltip.title = tooltipTitle;
  const icon = document.createElement("div");
  icon.className = "icon";
  icon.style.setProperty("--icon-url", `url(${iconSrc})`);
  tooltip.appendChild(icon);
  button.appendChild(tooltip);
  button.addEventListener("click", onClick);
  return button;
}
