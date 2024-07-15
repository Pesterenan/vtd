import { WorkArea } from '../components/workArea'

const initialize = (): void => {
  window.addEventListener('DOMContentLoaded', () => {
    const workArea = WorkArea.getInstance()
    workArea.addElement()
    createEventListeners(workArea)
  })
}

const createEventListeners = (workArea: WorkArea): void => {
  const importImageButton = document.getElementById('import-image-btn')
  const addElementButton = document.getElementById('add-element-btn')
  const loadProjectButton = document.getElementById('load-project')
  const saveProjectButton = document.getElementById('save-project')
  const zoomSlider = document.getElementById('zoom-slider') as HTMLInputElement

  zoomSlider.addEventListener('input', (event: InputEvent) => {
    const zoomLevel = parseFloat(event?.target?.value as string)
    workArea.setZoomLevel(zoomLevel)
  })
  saveProjectButton?.addEventListener('click', () => {
    const projectData = WorkArea.getInstance().saveProject()
    // @ts-ignore api defined in main.ts
    window.api.saveProject(projectData)
  })
  loadProjectButton?.addEventListener('click', () => {
    // @ts-ignore api defined in main.ts
    window.api.loadProject()
  })
  // @ts-ignore api defined in main.ts
  importImageButton?.addEventListener('click', () => window.api.loadImage())
  addElementButton?.addEventListener('click', () => WorkArea.getInstance().addElement())

  // @ts-ignore api defined in main.ts
  window.api.onLoadImageResponse((event, response) => {
    if (response.success) {
      workArea.addImageElement(response.data)
    } else {
      console.error(response.message)
    }
  })
  window.api.onSaveProjectResponse((event, response) => {
    if (response.success) {
      console.log(response.message)
    } else {
      console.error(response.message)
    }
  })
  window.api.onLoadProjectResponse((event, response) => {
    if (response.success) {
      WorkArea.getInstance().loadProject(response.data)
    } else {
      console.error(response.message)
    }
  })
}

initialize()
