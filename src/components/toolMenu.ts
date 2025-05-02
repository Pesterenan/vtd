import EVENT, { dispatch } from "src/utils/customEvents";
import getElementById from "src/utils/getElementById";

import SelectIcon from "src/assets/icons/select-tool.svg";
import GrabIcon from "src/assets/icons/move-tool.svg";
import RotateIcon from "src/assets/icons/rotate-tool.svg";
import ScaleIcon from "src/assets/icons/scale-tool.svg";
import TextIcon from "src/assets/icons/text-tool.svg";
import HandIcon from "src/assets/icons/hand-tool.svg";
import GradientIcon from "src/assets/icons/gradient-tool.svg";
import ZoomIcon from "src/assets/icons/zoom-tool.svg";
import type { ChangeToolDetail } from "./types";
import { TOOL } from "./types";

export class ToolMenu {
  private static instance: ToolMenu | null = null;
  private toolMenu?: HTMLMenuElement;
  private activeToolId: string | null = "select-tool";
  private isUsingTool = false;

  constructor() {
    this.createDOMElements();
    this.addEventListeners();
  }

  private createDOMElements(): void {
    this.toolMenu = document.createElement("menu");
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

    const mainWindow = getElementById<HTMLDivElement>("main-window");
    if (mainWindow) {
      mainWindow.appendChild(this.toolMenu);
    }
  }

  public static getInstance(): ToolMenu {
    if (this.instance === null) {
      this.instance = new ToolMenu();
    }
    return this.instance;
  }
  private addEventListeners(): void {
    const toolButtons = this.toolMenu?.querySelectorAll(".tool");
    toolButtons?.forEach((button) => {
      button.addEventListener("click", () => {
        if (!button.classList.contains("active")) {
          dispatch(EVENT.CHANGE_TOOL, {
            tool: button.getAttribute("data-tool") as TOOL,
          });
        }
      });
    });
    window.addEventListener(EVENT.CHANGE_TOOL, this.setActiveTool.bind(this));
    window.addEventListener(
      EVENT.USING_TOOL,
      (evt) => (this.isUsingTool = evt.detail.isUsingTool),
    );
  }

  private setActiveTool(evt: CustomEvent<ChangeToolDetail>): void {
    const { tool } = evt.detail;
    if (!this.isUsingTool) {
      if (this.activeToolId) {
        const previousTool = this.toolMenu?.querySelector(
          `[data-tool="${this.activeToolId}"]`,
        );
        previousTool?.classList.remove("active");
      }

      const newTool = this.toolMenu?.querySelector(`[data-tool="${tool}"]`);
      newTool?.classList.add("active");
      this.activeToolId = tool;
    }
  }
}
