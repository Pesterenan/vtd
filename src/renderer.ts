import { SideMenu } from "./components/sideMenu";
import { ToolMenu } from "./components/toolMenu";
import { EventBus } from "./utils/eventBus";
import { Alerts } from "./components/Alerts/alerts";
import { MainWindow } from "./components/mainWindow";
import { MIGRATION } from "./migrationFlags";

export function initializeVTD(uiEventBus: EventBus): void {
  if (!MIGRATION.Alerts) {
    const alertEventBus = new EventBus();
    uiEventBus.on("alert:add", (payload) =>
      alertEventBus.emit("alert:add", payload),
    );
    new Alerts(alertEventBus);
  }
  if (!MIGRATION.ToolMenu) ToolMenu.getInstance(uiEventBus);
  MainWindow.getInstance(uiEventBus);
  if (!MIGRATION.SideMenu) SideMenu.getInstance(uiEventBus);
}
