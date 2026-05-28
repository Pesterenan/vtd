import { GradientMenu } from "src/components/gradientMenu";
import { LayersMenu } from "src/components/layersMenu";
import { TextMenu } from "src/components/textMenu";
import { SIDE_MENU_WIDTH } from "src/constants";
import type { EventBus } from "src/utils/eventBus";
import getElementById from "src/utils/getElementById";
import { TransformMenu } from "./transformMenu";

export class SideMenu {
  private static instance: SideMenu | null = null;
  private sideMenu: HTMLMenuElement;
  private layersMenu: HTMLElement;
  private gradientMenu: HTMLElement;
  private textMenu: HTMLElement;
  private transformMenu: HTMLElement;

  constructor(eventBus: EventBus) {
    this.sideMenu = document.createElement("menu");
    this.transformMenu = TransformMenu.getInstance(eventBus).getMenu();
    this.layersMenu = LayersMenu.getInstance(eventBus).getMenu();
    this.textMenu = TextMenu.getInstance(eventBus).getMenu();
    this.gradientMenu = GradientMenu.getInstance(eventBus).getMenu();
    this.createDOMElements();
  }

  private createDOMElements(): void {
    this.sideMenu.id = "side-menu";
    this.sideMenu.className = "side-menu";
    this.sideMenu.setAttribute("style", `width: ${SIDE_MENU_WIDTH}px;`);
    const domElements: HTMLElement[] = [];

    const otherMenusDiv = document.createElement("div");
    otherMenusDiv.className = "container column g-05 jc-sb";
    otherMenusDiv.style.overflowY = 'auto';
    otherMenusDiv.style.paddingInline = '0.15rem';
    otherMenusDiv.style.maxWidth = `${SIDE_MENU_WIDTH - 16}px`;
    otherMenusDiv.append(
      this.transformMenu,
      this.layersMenu,
      this.textMenu,
      this.gradientMenu,
    );

    domElements.push(
      otherMenusDiv,
    );

    this.sideMenu.append(...domElements);

    const appWindow = getElementById<HTMLDivElement>("app-window");
    if (appWindow) {
      appWindow.appendChild(this.sideMenu);
    }
  }

  public static getInstance(eventBus: EventBus): SideMenu {
    if (SideMenu.instance === null) {
      SideMenu.instance = new SideMenu(eventBus);
    }
    return SideMenu.instance;
  }
}
