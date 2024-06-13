import { WorkArea } from '../components/workArea'

const initialize = (): void => {
  window.addEventListener('DOMContentLoaded', () => {
    const workArea = WorkArea.getInstance()
    workArea.addElement();
    workArea.addElement();
    createEventListeners()
  })
}

const createEventListeners = (): void => {
  const openImageButton = document.getElementById('open-image-btn')
  const addElementButton = document.getElementById('add-element-btn')
  openImageButton?.addEventListener('click', () => console.log('clicou'))
  addElementButton?.addEventListener('click', () => WorkArea.getInstance().addElement())
}

initialize()
