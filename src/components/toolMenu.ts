import EVENT from "../utils/customEvents";
import getElementById from "../utils/getElementById";

export class ToolMenu {
  private static instance: ToolMenu | null = null;
  private toolMenu?: HTMLMenuElement;
  private activeToolId: string | null = null;

  constructor() {
    this.createDOMElements();
    this.addEventListeners();
  }

  private createDOMElements(): void {
    const mainWindow = getElementById<HTMLDivElement>("main-window");
    this.toolMenu = document.createElement("menu");
    this.toolMenu.id = "tool-menu";
    this.toolMenu.className = "container-column ai-c jc-fs g-05";
    this.toolMenu.innerHTML = `
<label>
  <tooltip title="Ferramentas">
    Ferr.
  </tooltip>
</label>
<button id='select-tool' class='tool' aria-label='Selecionar elemento'><tooltip />V</button>
<button id='grab-tool' class='tool' aria-label='Mover elemento'>G</button>
<button id='rotate-tool' class='tool' aria-label='Rotacionar elemento'>R</button>
<button id='scale-tool' class='tool' aria-label='Escalonar elemento'>S</button>
<button id='text-tool' class='tool' aria-label='Editar texto'>T</button>
<button id='gradient-tool' class='tool' aria-label='Criar gradientes'>H</button>
<button id='zoom-tool' class='tool' aria-label='Modificar zoom'>Z</button>
`;

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
                toolId: button.id,
              },
            }),
          );
        }
      });
    });
    window.addEventListener(EVENT.CHANGE_TOOL, this.setActiveTool.bind(this));
  }

  private setActiveTool(evt: Event): void {
    const customEvent = evt as CustomEvent<{ toolId: string }>;
    const { toolId } = customEvent.detail;
    if (this.activeToolId) {
      const previousTool = this.toolMenu?.querySelector(
        `#${this.activeToolId}`,
      );
      previousTool?.classList.remove("active");
    }

    const newTool = this.toolMenu?.querySelector(`#${toolId}`);
    newTool?.classList.add("active");
    this.activeToolId = toolId;
  }
}
