import { WorkArea } from '../components/workArea'

const initialize = (): void => {
  window.addEventListener('DOMContentLoaded', () => {
    const workArea = WorkArea.getInstance()
    addOpenImageButtonListener()
  })
}

const addOpenImageButtonListener = (): void => {
  const openImageButton = document.getElementById('open-image-btn')
  openImageButton?.addEventListener('click', () => console.log('clicou'))
}

initialize()
