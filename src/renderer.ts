import { SideMenu } from "./components/sideMenu";
import { ToolMenu } from "./components/toolMenu";
import { EventBus } from "./utils/eventBus";
import { Alerts } from "./components/Alerts/alerts";
import { MainWindow } from "./components/mainWindow";

export function initializeVTD(uiEventBus: EventBus): void {
  const alertEventBus = new EventBus();
  uiEventBus.on("alert:add", (payload) =>
    alertEventBus.emit("alert:add", payload),
  );
  new Alerts(alertEventBus);
  ToolMenu.getInstance(uiEventBus);
  MainWindow.getInstance(uiEventBus);
  SideMenu.getInstance(uiEventBus);
}
