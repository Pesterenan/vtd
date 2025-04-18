import "src/assets/main.css";
import { SideMenu } from "src/components/sideMenu";
import { ToolMenu } from "src/components/toolMenu";
import { WorkArea } from "src/components/workArea";
import exampleProject from "src/exampleProject.json";
import { Alerts } from "./components/alerts/alerts";
import EVENT from "./utils/customEvents";

const initializeVTD = (): void => {
  window.addEventListener("DOMContentLoaded", () => {
    new Alerts();
    ToolMenu.getInstance();
    const workArea = WorkArea.getInstance();
    SideMenu.getInstance();
    createEventListeners(workArea);
    workArea.loadProject(JSON.stringify(exampleProject));
    window.dispatchEvent(new CustomEvent(EVENT.ADD_ALERT, { detail: { message: "VTD initialized", type: "sucesso" } }));
    window.dispatchEvent(new CustomEvent(EVENT.ADD_ALERT, { detail: { message: "VTD initialized2", type: "sucesso" } }));
    window.dispatchEvent(new CustomEvent(EVENT.ADD_ALERT, { detail: { message: "VTD initialized3", type: "erro" } }));
  });
};

const createEventListeners = (workArea: WorkArea): void => {
  window.api.onProcessVideoFrameResponse((_, response) => {
    if (response.success) {
      const uint8Array = new Uint8Array(response.data as Uint8Array);
      const blob = new Blob([uint8Array], { type: "image/png" });

      const reader = new FileReader();
      reader.onloadend = function (): void {
        const dataURL = reader.result as string;
        workArea.addImageElement(dataURL);
      };
      reader.readAsDataURL(blob);
    } else {
      console.error(response.message);
    }
  });

  window.api.onLoadVideoResponse((_, response) => {
    if (response.success) {
      console.log(response.message);
    } else {
      console.error(response.message);
    }
  });

  window.api.onLoadImageResponse((_, response) => {
    if (response.success) {
      workArea.addImageElement(response.data as string);
      console.log(response.message);
    } else {
      console.error(response.message);
    }
  });

  window.api.onSaveProjectResponse((_, response) => {
    if (response.success) {
      console.log(response.message);
    } else {
      console.error(response.message);
    }
  });

  window.api.onLoadProjectResponse((_, response) => {
    if (response.success) {
      WorkArea.getInstance().loadProject(response.data as string);
    } else {
      console.error(response.message);
    }
  });
};

initializeVTD();
