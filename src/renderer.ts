import "src/assets/main.css";
import { SideMenu } from "src/components/sideMenu";
import { ToolMenu } from "src/components/toolMenu";
import { WorkArea } from "src/components/workArea";
import exampleProject from "src/exampleProject.json";

const initializeVTD = (): void => {
  window.addEventListener("DOMContentLoaded", () => {
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
