import { SideMenu } from './components/sideMenu';
import { WorkArea } from './components/workArea';

const initializeVTD = (): void => {
  window.addEventListener('DOMContentLoaded', () => {
    const workArea = WorkArea.getInstance();
    const sideMenu = SideMenu.getInstance();
    workArea.addElement();
    createEventListeners(workArea);
  });
};

const createEventListeners = (workArea: WorkArea): void => {
  window.api.onProcessVideoFrameResponse((event, response) => {
    console.log(response, 'response');
    if (response.success) {
      const uint8Array = new Uint8Array(response.data);
      const blob = new Blob([uint8Array], { type: 'image/png' });

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
  window.api.onLoadVideoResponse((event, response) => {
    if (response.success) {
      window.api.processVideoFrame(response.data.format.filename, 0.15);
    } else {
      console.error(response.message);
    }
  });
  window.api.onLoadImageResponse((event, response) => {
    if (response.success) {
      workArea.addImageElement(response.data);
    } else {
      console.error(response.message);
    }
  });
  window.api.onSaveProjectResponse((event, response) => {
    if (response.success) {
      console.log(response.message);
    } else {
      console.error(response.message);
    }
  });
  window.api.onLoadProjectResponse((event, response) => {
    if (response.success) {
      WorkArea.getInstance().loadProject(response.data);
    } else {
      console.error(response.message);
    }
  });
};

initializeVTD();
