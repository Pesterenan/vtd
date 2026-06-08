import { GradientMenu } from "src/components/gradientMenu";
import { LayersMenu } from "src/components/layersMenu";
import { TextMenu } from "src/components/textMenu";
import { SIDE_MENU_WIDTH } from "src/constants";
import type { EventBus } from "src/utils/eventBus";
import getElementById from "src/utils/getElementById";
import { TransformMenu } from "./transformMenu";
import { MIGRATION } from "src/migrationFlags";

export class SideMenu {
  private static instance: SideMenu | null = null;
  private sideMenu: HTMLMenuElement;

  constructor(eventBus: EventBus) {
    this.sideMenu = document.createElement("menu");
    this.createDOMElements(eventBus);
  }

  private createDOMElements(eventBus: EventBus): void {
    if (MIGRATION.SideMenu) return;

    this.sideMenu.id = "side-menu";
    this.sideMenu.className = "side-menu";
    this.sideMenu.setAttribute("style", `width: ${SIDE_MENU_WIDTH}px;`);

    const otherMenusDiv = document.createElement("div");
    otherMenusDiv.className = "container column g-05 jc-sb";
    otherMenusDiv.style.overflowY = 'auto';
    otherMenusDiv.style.paddingInline = '0.15rem';
    otherMenusDiv.style.maxWidth = `${SIDE_MENU_WIDTH - 16}px`;

    const panels: HTMLElement[] = [];
    if (!MIGRATION.TransformMenu) {
      panels.push(TransformMenu.getInstance(eventBus).getMenu());
    }
    if (!MIGRATION.LayersMenu) {
      panels.push(LayersMenu.getInstance(eventBus).getMenu());
    }
    if (!MIGRATION.TextMenu) {
      panels.push(TextMenu.getInstance(eventBus).getMenu());
    }
    if (!MIGRATION.GradientMenu) {
      panels.push(GradientMenu.getInstance(eventBus).getMenu());
    }
    otherMenusDiv.append(...panels);

    this.sideMenu.append(otherMenusDiv);

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
