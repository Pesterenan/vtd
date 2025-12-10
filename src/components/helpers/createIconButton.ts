export default function createIconButton(
  id: string,
  tooltipTitle: string,
  iconSrc: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = id;
  button.className = "btn-common";
  button.title = tooltipTitle; // Use standard title attribute for tooltip

  const icon = document.createElement("div");
  icon.className = "icon";
  icon.style.setProperty("--icon-url", `url(${iconSrc})`);
  button.appendChild(icon);
  button.addEventListener("click", onClick);
  return button;
}
