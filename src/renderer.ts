import "./assets/main.css";
import { SideMenu } from "./components/sideMenu";
import { ToolMenu } from "./components/toolMenu";
import { EventBus } from "./utils/eventBus";
import { Alerts } from "./components/alerts/alerts";
import { MainWindow } from "./components/mainWindow";

const initializeVTD = (): void => {
  window.addEventListener("DOMContentLoaded", () => {
    console.log(`VTD Initializing...`);
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
