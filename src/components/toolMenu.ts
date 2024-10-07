import EVENT from "src/utils/customEvents";
import getElementById from "src/utils/getElementById";

import SelectIcon from "src/assets/icons/select-tool.svg";
import GrabIcon from "src/assets/icons/move-tool.svg";
import RotateIcon from "src/assets/icons/rotate-tool.svg";
import ScaleIcon from "src/assets/icons/scale-tool.svg";
import TextIcon from "src/assets/icons/text-tool.svg";
import HandIcon from "src/assets/icons/hand-tool.svg";
import GradientIcon from "src/assets/icons/gradient-tool.svg";
import ZoomIcon from "src/assets/icons/zoom-tool.svg";
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
    this.toolMenu.className = "container-column ai-c jc-fs g-05";
    this.toolMenu.innerHTML = `
      <label>
        <tooltip title="Ferramentas" />
          Ferr.
      </label>
      <button data-tool="${TOOL.SELECT}" class='tool active' aria-label='(V) Selecionar elementos'>
        <tooltip title='(V) Selecionar elementos'/>
        <img src="${SelectIcon}" alt="Selecionar" />
      </button>
      <button data-tool="${TOOL.GRAB}" class='tool' aria-label='(G) Mover elementos'>
        <tooltip title='(G) Mover elementos'/>
        <img src="${GrabIcon}" alt="Mover" />
      </button>
      <button data-tool="${TOOL.ROTATE}" class='tool' aria-label='(R) Rotacionar elementos'>
        <tooltip title='(R) Rotacionar elementos'/>
        <img src="${RotateIcon}" alt="Mover" />
      </button>
      <button data-tool="${TOOL.SCALE}" class='tool' aria-label='(S) Escalonar elementos'>
        <tooltip title='(S) Escalonar elementos'/>
        <img src="${ScaleIcon}" alt="Mover" />
      </button>
      <button data-tool="${TOOL.TEXT}" class='tool' aria-label='(T) Criar textos'>
        <tooltip title='(T) Criar textos'/>
        <img = src="${TextIcon}"alt="Texto" />
      </button>
      <button data-tool="${TOOL.GRADIENT}" class='tool' aria-label='(H) Criar gradientes'>
        <tooltip title='(H) Criar gradientes'/>
        <img = src="${GradientIcon}"alt="Gradiente" />
      </button>
      <button data-tool="${TOOL.HAND}" class='tool' aria-label='(Espaço) Mover Área de Trabalho'>
        <tooltip title='(Espaço) Mover Área de Trabalho'/>
        <img src="${HandIcon}"alt="Mão" />
      </button>
      <button data-tool="${TOOL.ZOOM}" class='tool' aria-label='(Z) Modificar nível de zoom'>
        <tooltip title='(Z) Modificar nível de zoom'>
        <img src="${ZoomIcon}"alt="Zoom" />
        </tooltip>
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
          window.dispatchEvent(
            new CustomEvent(EVENT.CHANGE_TOOL, {
              detail: {
                tool: button.getAttribute('data-tool') as TOOL,
              },
            }),
          );
        }
      });
    });
    window.addEventListener(EVENT.CHANGE_TOOL, this.setActiveTool.bind(this));
    window.addEventListener(
      EVENT.USING_TOOL,
      (evt: Event) =>
        (this.isUsingTool = (
          evt as CustomEvent<{
            isUsingTool: boolean;
          }>
        ).detail.isUsingTool),
    );
  }

  private setActiveTool(evt: Event): void {
    const customEvent = evt as CustomEvent<{ tool: string }>;
    const { tool } = customEvent.detail;
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
