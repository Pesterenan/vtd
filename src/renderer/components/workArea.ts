import { Element } from './element'

export class WorkArea {
  private static instance: WorkArea | null = null
  private workAreaCanvas: HTMLCanvasElement
  private elements: Element[] | []
  private context: CanvasRenderingContext2D | null = null

  private constructor() {
    const mainCanvasDiv: HTMLDivElement = document.getElementById('main-canvas') as HTMLDivElement
    if (!mainCanvasDiv) {
      throw new Error("Element with id 'main-canvas' was not found")
    }

    this.elements = []
    this.workAreaCanvas = document.createElement('canvas')
    mainCanvasDiv.append(this.workAreaCanvas)
    this.workAreaCanvas.width = 400
    this.workAreaCanvas.height = 300
    this.workAreaCanvas.style.backgroundColor = 'grey'

    this.context = this.workAreaCanvas.getContext('2d')
    this.workAreaCanvas.addEventListener('click', () =>
      this.addElement(new Element(10, 10, 100, 100, 1))
    )
  }

  public static getInstance(): WorkArea {
    if (this.instance === null) {
      this.instance = new WorkArea()
    }
    return this.instance
  }

  public update(): void {
    if (!this.context) {
      throw new Error('Canvas context is not available')
    }
    this.clearCanvas()
    for (const element of this.elements) {
      element.draw(this.context)
    }
    console.log('elements drawn')
  }

  private clearCanvas(): void {
    if (this.context) {
      this.context.clearRect(0, 0, this.workAreaCanvas.width, this.workAreaCanvas.height)
    }
  }

  public addElement(element: Element) {
    this.elements.push(element)
    this.update()
  }

  public getCanvas(): HTMLCanvasElement {
    return this.workAreaCanvas
  }
}
