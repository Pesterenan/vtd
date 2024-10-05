import getElementById from "../utils/getElementById";

export class ToolMenu {
  private static instance: ToolMenu | null = null;
  private toolMenu?: HTMLMenuElement;
  private activeTool: string | null = null;

  constructor() {
    this.createDOMElements();
    this.addToolEvents();
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
  private addToolEvents(): void {
    const toolButtons = this.toolMenu?.querySelectorAll(".tool");
    toolButtons?.forEach((button) => {
      button.addEventListener("click", (event) => {
        const clickedButton = event.currentTarget as HTMLButtonElement;
        this.setActiveTool(clickedButton.id);
      });
    });
  }

  private setActiveTool(toolId: string): void {
    if (this.activeTool) {
      const previousToolButton = this.toolMenu?.querySelector(
        `#${this.activeTool}`,
      );
      previousToolButton?.classList.remove("active");
    }

    const newToolButton = this.toolMenu?.querySelector(`#${toolId}`);
    newToolButton?.classList.add("active");
    this.activeTool = toolId;

    // Aqui você pode adicionar a lógica para ativar a ferramenta correspondente
    console.log(`Tool activated: ${toolId}`);
  }
}
