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
  const fileInput = document.getElementById('file-input') as HTMLInputElement
  const zoomSlider = document.getElementById('zoom-slider') as HTMLInputElement
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
  // @ts-ignore api defined in main.ts
  window.api.onLoadImageResponse((event, response) => {
    if (response.success) {
      const src = `data:image/png;base64,${response.data}`
      workArea.addImageElement(src)
    } else {
      console.error(response.message)
    }
  })
  addElementButton?.addEventListener('click', () => WorkArea.getInstance().addElement())
}

initialize()
