import { WorkArea } from '../components/workArea'

const initialize = (): void => {
  window.addEventListener('DOMContentLoaded', () => {
    const workArea = WorkArea.getInstance()
    workArea.addElement()
    createEventListeners(workArea)
  })
}

const createEventListeners = (workArea: WorkArea): void => {
  const openImageButton = document.getElementById('open-image-btn')
  const addElementButton = document.getElementById('add-element-btn')
  const loadProjectButton = document.getElementById('load-project')
  const saveProjectButton = document.getElementById('save-project')
  const fileInput = document.getElementById('file-input') as HTMLInputElement
  const zoomSlider = document.getElementById('zoom-slider') as HTMLInputElement

  saveProjectButton?.addEventListener('click', () => {
    const projectData = WorkArea.getInstance().saveProject()
    // @ts-ignore api defined in main.ts
    window.api.saveProject(projectData)
  })
  loadProjectButton?.addEventListener('click', () => {
    // @ts-ignore api defined in main.ts
    window.api.loadProject()
  })
  zoomSlider.addEventListener('input', (event: Event) => {
    const zoomLevel = parseFloat(event?.target?.value as string)
    workArea.setZoomLevel(zoomLevel)
  })
  openImageButton?.addEventListener('click', () => console.log(fileInput))
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (file) {
      // @ts-ignore api defined in main.ts
      window.api.loadImage(file.path)
    }
  })
  addElementButton?.addEventListener('click', () => WorkArea.getInstance().addElement())

  // @ts-ignore api defined in main.ts
  window.api.onLoadImageResponse((event, response) => {
    if (response.success) {
      const src = `data:image/png;base64,${response.data}`
      workArea.addImageElement(src)
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
