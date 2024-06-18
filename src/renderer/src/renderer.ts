import { WorkArea } from '../components/workArea'

const initialize = (): void => {
  window.addEventListener('DOMContentLoaded', () => {
    const workArea = WorkArea.getInstance()
    createEventListeners()
  })
}

const createEventListeners = (): void => {
  const openImageButton = document.getElementById('open-image-btn')
  const addElementButton = document.getElementById('add-element-btn')
  const fileInput = document.getElementById('file-input') as HTMLInputElement
  openImageButton?.addEventListener('click', () => console.log(fileInput))
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (file) {
      window.electron.loadImage(file.path)
    }
  })
  window.electron.onLoadImageResponse((event, response) => {
    if (response.success) {
      const src = `data:image/png;base64,${response.data}`
      WorkArea.getInstance().addImageElement(src)
    } else {
      console.error(response.message)
    }
  })
  addElementButton?.addEventListener('click', () => WorkArea.getInstance().addElement())
}

initialize()
