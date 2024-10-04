import "./assets/base.css";
import "./assets/main.css";
import { SideMenu } from "./components/sideMenu";
import { WorkArea } from "./components/workArea";

const initializeVTD = (): void => {
  window.addEventListener("DOMContentLoaded", () => {
    const workArea = WorkArea.getInstance();
    SideMenu.getInstance();
    workArea.addTextElement();
    createEventListeners(workArea);
  });
};

const createEventListeners = (workArea: WorkArea): void => {
  window.api.onProcessVideoFrameResponse((_, response) => {
    if (response.success) {
      const uint8Array = new Uint8Array(response.data);
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
      workArea.addImageElement(response.data);
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
      WorkArea.getInstance().loadProject(response.data);
    } else {
      console.error(response.message);
    }
  });
};

initializeVTD();
