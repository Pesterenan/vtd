import ErrorElement from './errorElement';

export class LayersMenu {
  private static instance: LayersMenu | null = null;
  private layersSection: HTMLElement | null = null;

  private constructor() {
    this.createDOMElements();
  }

  public static getInstance(): LayersMenu {
    if (this.instance === null) {
      this.instance = new LayersMenu();
    }
    return this.instance;
  }

  public getMenu(): HTMLElement {
    if (this.layersSection) {
      return this.layersSection;
    }
    return ErrorElement('Menu não instanciado');
  }

  private createDOMElements(): void {
    this.layersSection = document.createElement('section');
    this.layersSection.id = 'sec_layers-menu';
    this.layersSection.innerHTML = `
      <p style="align-self: flex-start;">Camadas:</p>
      <div style="display: flex; flex-wrap: nowrap; width: 100%;">
        <ul id="ul_layers-list">
          <li class='li_layer-item' draggable="true">
          <button>Option 1</button></li>
          <li draggable="true">Option 2</li>
          <li draggable="true">Option 3</li>
          <li draggable="true">Option 4</li>
        </ul>
      </div>
    `;
  }
}
