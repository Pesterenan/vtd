import "src/assets/main.css";
import { SideMenu } from "src/components/sideMenu";
import { ToolMenu } from "src/components/toolMenu";
import { WorkArea } from "src/components/workArea";
import exampleProject from "src/exampleProject.json";
import { EventBus } from "src/utils/eventBus";
import { Alerts } from "./components/alerts/alerts";

const initializeVTD = (): void => {
  window.addEventListener("DOMContentLoaded", () => {
    const alertEventBus = new EventBus();
    const uiEventBus = new EventBus();
    uiEventBus.on("alert:add", (payload) => alertEventBus.emit("alert:add", payload));
    new Alerts(alertEventBus);
    ToolMenu.getInstance(uiEventBus);
    const workArea = WorkArea.getInstance(uiEventBus);
    SideMenu.getInstance(uiEventBus);
    workArea.loadProject(JSON.stringify(exampleProject));
  });
};

initializeVTD();
