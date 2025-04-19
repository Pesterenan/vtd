import "src/assets/main.css";
import { SideMenu } from "src/components/sideMenu";
import { ToolMenu } from "src/components/toolMenu";
import { WorkArea } from "src/components/workArea";
import exampleProject from "src/exampleProject.json";
import { Alerts } from "./components/alerts/alerts";
import EVENT, { dispatch } from "./utils/customEvents";

const initializeVTD = (): void => {
  window.addEventListener("DOMContentLoaded", () => {
    new Alerts();
    ToolMenu.getInstance();
    const workArea = WorkArea.getInstance();
    SideMenu.getInstance();
    createEventListeners(workArea);
    workArea.loadProject(JSON.stringify(exampleProject));
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
      dispatch(EVENT.ADD_ALERT, {
        message: response.message,
        type: response.success ? "success" : "error",
      });
    }
  });

  window.api.onLoadVideoResponse((_, response) => {
    dispatch(EVENT.ADD_ALERT, {
      message: response.message,
      type: response.success ? "success" : "error",
    });
  });

  window.api.onLoadImageResponse((_, response) => {
    dispatch(EVENT.ADD_ALERT, {
      message: response.message,
      type: response.success ? "success" : "error",
    });
    if (response.success) {
      workArea.addImageElement(response.data as string);
    }
  });

  window.api.onSaveProjectResponse((_, response) => {
    dispatch(EVENT.ADD_ALERT, {
      message: response.message,
      type: response.success ? "success" : "error",
    });
  });

  window.api.onLoadProjectResponse((_, response) => {
    dispatch(EVENT.ADD_ALERT, {
      message: response.message,
      type: response.success ? "success" : "error",
    });
    if (response.success) {
      WorkArea.getInstance().loadProject(response.data as string);
    }
  });
};

initializeVTD();
