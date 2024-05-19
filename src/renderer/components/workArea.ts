import { Element } from './element'

export class WorkArea {
  private static instance: WorkArea | null = null
  private workAreaCanvas: HTMLCanvasElement
  private elements: Element[] = []
  private context: CanvasRenderingContext2D | null = null
  private selection: { x1: number; y1: number; x2: number; y2: number } | null = null
  private isDragging: boolean = false

  private constructor() {
    const mainCanvasDiv: HTMLDivElement = document.getElementById('main-canvas') as HTMLDivElement
    if (!mainCanvasDiv) {
      throw new Error("Element with id 'main-canvas' was not found")
    }

    this.elements = []
    this.workAreaCanvas = document.createElement('canvas')
    mainCanvasDiv.append(this.workAreaCanvas)
    this.workAreaCanvas.width = 480
    this.workAreaCanvas.height = 320
    this.workAreaCanvas.style.backgroundColor = 'white'

    this.context = this.workAreaCanvas.getContext('2d')
    this.isDragging = false
    this.createEventListeners(this.workAreaCanvas)
  }

  private handleMouseDown({ offsetX, offsetY }: MouseEvent): void {
    this.isDragging = true
    this.selection = { x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY }
  }

  private handleMouseMove({ offsetX, offsetY }: MouseEvent): void {
    if (!this.isDragging) return

    if (this.selection) {
      const { x1, y1, x2, y2 } = this.selection
      this.selection = { x1, y1, x2: offsetX, y2: offsetY }

      if (this.context) {
        this.update()
        this.context.strokeStyle = 'black'
        this.context.strokeRect(x1, y1, x2 - x1, y2 - y1)
      }
    }
  }

  private handleMouseUp(): void {
    if (!this.isDragging) return

    if (this.selection) {
      this.elements.forEach((element) => {
        const isSelected = element.isWithinBounds(this.selection)
        element.setSelected(isSelected)
      })

      this.isDragging = false
      this.update()
    }
  }

  private createEventListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this))
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this))
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
  }

  private clearCanvas(): void {
    if (this.context) {
      this.context.clearRect(0, 0, this.workAreaCanvas.width, this.workAreaCanvas.height)
    }
  }

  public addElement(): void {
    const width = 50
    const height = 50
    const xPos = Math.floor(Math.random() * (this.workAreaCanvas.width - width))
    const yPos = Math.floor(Math.random() * (this.workAreaCanvas.height - height))
    const newElement = new Element(xPos, yPos, width, height, this.elements.length)
    this.elements.push(newElement)
    this.update()
  }

  public getCanvas(): HTMLCanvasElement {
    return this.workAreaCanvas
  }
}
