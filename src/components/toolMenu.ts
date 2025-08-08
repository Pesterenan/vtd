import getElementById from "src/utils/getElementById";

import GradientIcon from "src/assets/icons/gradient-tool.svg";
import HandIcon from "src/assets/icons/hand-tool.svg";
import GrabIcon from "src/assets/icons/move-tool.svg";
import RotateIcon from "src/assets/icons/rotate-tool.svg";
import ScaleIcon from "src/assets/icons/scale-tool.svg";
import SelectIcon from "src/assets/icons/select-tool.svg";
import TextIcon from "src/assets/icons/text-tool.svg";
import ZoomIcon from "src/assets/icons/zoom-tool.svg";
import type { EventBus } from "src/utils/eventBus";
import { TOOL } from "./types";

export class ToolMenu {
  private static instance: ToolMenu | null = null;
  private activeToolId: string | null = "select-tool";
  private eventBus: EventBus;
  private toolMenu: HTMLMenuElement;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.toolMenu = document.createElement("menu");
    this.createDOMElements();
    this.addEventListeners();
  }

  private createDOMElements(): void {
    this.toolMenu.id = "tool-menu";
    this.toolMenu.className = "container column ai-c jc-fs g-05";
    this.toolMenu.innerHTML = `
<label>
  <tooltip title="Ferramentas" />
  Ferr.
</label>
<button data-tool="${TOOL.SELECT}" class='btn-common active' aria-label='(V) Selecionar elementos'>
  <tooltip title='(V) Selecionar elementos'/>
  <div class="icon" style="--icon-url: url(${SelectIcon});" />
</button>
<button data-tool="${TOOL.GRAB}" class='btn-common' aria-label='(G) Mover elementos'>
  <tooltip title='(G) Mover elementos'/>
  <div class="icon" style="--icon-url: url(${GrabIcon});" />
</button>
<button data-tool="${TOOL.ROTATE}" class='btn-common' aria-label='(R) Rotacionar elementos'>
  <tooltip title='(R) Rotacionar elementos'/>
  <div class="icon" style="--icon-url: url(${RotateIcon});" />
</button>
<button data-tool="${TOOL.SCALE}" class='btn-common' aria-label='(S) Escalonar elementos'>
  <tooltip title='(S) Escalonar elementos'/>
  <div class="icon" style="--icon-url: url(${ScaleIcon});" />
</button>
<button data-tool="${TOOL.TEXT}" class='btn-common' aria-label='(T) Criar textos'>
  <tooltip title='(T) Criar textos'/>
  <div class="icon" style="--icon-url: url(${TextIcon});" />
</button>
<button data-tool="${TOOL.GRADIENT}" class='btn-common' aria-label='(H) Criar gradientes'>
  <tooltip title='(H) Criar gradientes'/>
  <div class="icon" style="--icon-url: url(${GradientIcon});" />
</button>
<button data-tool="${TOOL.HAND}" class='btn-common' aria-label='(Espaço) Mover Área de Trabalho'>
  <tooltip title='(Espaço) Mover Área de Trabalho'/>
  <div class="icon" style="--icon-url: url(${HandIcon});" />
</button>
<button data-tool="${TOOL.ZOOM}" class='btn-common' aria-label='(Z) Modificar nível de zoom'>
  <tooltip title='(Z) Modificar nível de zoom' />
  <div class="icon" style="--icon-url: url(${ZoomIcon});" />
</button>
`;

    const appWindow = getElementById<HTMLDivElement>("app-window");
    if (appWindow) {
      appWindow.appendChild(this.toolMenu);
    }
  }

  public static getInstance(eventBus: EventBus): ToolMenu {
    if (ToolMenu.instance === null) {
      ToolMenu.instance = new ToolMenu(eventBus);
    }
    return ToolMenu.instance;
  }

  private addEventListeners(): void {
    const toolButtons = this.toolMenu.querySelectorAll("[data-tool]");
    for (const button of toolButtons) {
      button.addEventListener("click", () => {
        this.eventBus.emit(
          "tool:change",
          button.getAttribute("data-tool") as TOOL,
        );
      });
    }
    this.eventBus.on("tool:change", this.setActiveTool);
  }

  private setActiveTool = (tool: TOOL): void => {
    if (this.activeToolId) {
      const previousTool = this.toolMenu.querySelector(
        `[data-tool="${this.activeToolId}"]`,
      );
      previousTool?.classList.remove("active");
    }

    const newTool = this.toolMenu.querySelector(`[data-tool="${tool}"]`);
    newTool?.classList.add("active");
    this.activeToolId = tool;
  }
}
