const initialize = (): void => {
  window.addEventListener('DOMContentLoaded', () => {
    createWorkArea()
    addOpenImageButtonListener()
  })
}

const createWorkArea = (): void => {
  const mainCanvasDiv: HTMLDivElement = document.getElementById('main-canvas')
  const workAreaCanvas: HTMLCanvasElement = document.createElement('canvas')
  mainCanvasDiv.append(workAreaCanvas)
  workAreaCanvas.width = 400
  workAreaCanvas.height = 300
  workAreaCanvas.style.backgroundColor = 'grey'
}

const addOpenImageButtonListener = (): void => {
  const openImageButton = document.getElementById('open-image-btn')
  openImageButton?.addEventListener('click', () => console.log('clicou'))
}

initialize()
