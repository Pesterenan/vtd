import "src/assets/main.css";
import { SideMenu } from "src/components/sideMenu";
import { ToolMenu } from "src/components/toolMenu";
import { EventBus } from "src/utils/eventBus";
import { Alerts } from "./components/alerts/alerts";
import { MainWindow } from "./components/mainWindow";

const initializeVTD = (): void => {
  window.addEventListener("DOMContentLoaded", () => {
    const alertEventBus = new EventBus();
    const uiEventBus = new EventBus();
    uiEventBus.on("alert:add", (payload) =>
      alertEventBus.emit("alert:add", payload),
    );
    new Alerts(alertEventBus);
    ToolMenu.getInstance(uiEventBus);
    MainWindow.getInstance(uiEventBus);
    SideMenu.getInstance(uiEventBus);
  });
};

initializeVTD();
