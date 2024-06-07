import { Element } from './element'
import { TransformBox } from './transformBox'
import { BoundingBox, MouseStatus } from './types'

const DRAGGING_DISTANCE = 5

export class WorkArea {
  private static instance: WorkArea | null = null
  private workAreaCanvas: HTMLCanvasElement
  private elements: Element[] = []
  private context: CanvasRenderingContext2D | null = null
  private selection: BoundingBox | null = null
  private transformBox: TransformBox | null = null
  private mouseStatus: MouseStatus = MouseStatus.UP

  private constructor() {
    const mainCanvasDiv: HTMLDivElement = document.getElementById('main-canvas') as HTMLDivElement
    if (!mainCanvasDiv) {
      throw new Error("Element with id 'main-canvas' was not found")
    }

    this.workAreaCanvas = document.createElement('canvas')
    mainCanvasDiv.append(this.workAreaCanvas)
    this.workAreaCanvas.width = 480
    this.workAreaCanvas.height = 320
    this.workAreaCanvas.style.backgroundColor = 'white'

    this.context = this.workAreaCanvas.getContext('2d')
    if (!this.context) {
      throw new Error('Unable to get canvas context')
    }
    this.createEventListeners(this.workAreaCanvas)
  }

  private createEventListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this))
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this))
  }

  private handleMouseDown(event: MouseEvent): void {
    this.mouseStatus = MouseStatus.DOWN
    const { offsetX, offsetY } = event

    if (this.transformBox) {
      this.transformBox.handleMouseDown(event)
      if (this.transformBox.isHandleDragging) {
        return
      }
    }

    this.selection = { x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY }
  }

  private handleMouseMove(event: MouseEvent): void {
    this.update()
    // Mover elemento ao invés de desenhar caixa de seleção
    if (this.transformBox && this.transformBox.isHandleDragging) {
      this.transformBox.handleMouseMove(event)
      return
    }

    if (this.selection) {
      const { offsetX, offsetY } = event
      this.selection!.x2 = offsetX
      this.selection!.y2 = offsetY
      if (this.mouseStatus === MouseStatus.MOVE) {
        if (this.context) {
          const { x1, y1, x2, y2 } = this.selection
          this.context.strokeStyle = 'grey'
          this.context.strokeRect(x1, y1, x2 - x1, y2 - y1)
        }
      }

      if (this.mouseStatus === MouseStatus.DOWN) {
        const distance = Math.sqrt(
          Math.pow(this.selection.x2 - this.selection.x1, 2) +
            Math.pow(this.selection.y2 - this.selection.y1, 2)
        )
        // se eu arrastar o mouse, longe o bastante
        if (distance > DRAGGING_DISTANCE) {
          this.mouseStatus = MouseStatus.MOVE
        }
      }
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (this.mouseStatus === MouseStatus.MOVE) {
      // Se tiver algo selecionado, lidar com a seleção primeiro
      if (this.transformBox && this.transformBox.isHandleDragging) {
        this.transformBox.handleMouseUp()
        this.mouseStatus = MouseStatus.UP
        return
      }

      // Busca todos os elementos embaixo da seleção
      const selectedElements = this.elements.filter((el) => el.isWithinBounds(this.selection))
      if (selectedElements.length) {
        this.transformBox = new TransformBox(selectedElements, this.workAreaCanvas)
      } else {
        this.transformBox = null
      }
      this.selection = null
      this.mouseStatus = MouseStatus.UP
    }
    // Se estiver apenas clicando, seleciona o que estiver embaixo do mouse
    if (this.mouseStatus === MouseStatus.DOWN) {
      this.selection = {
        x1: event.offsetX,
        y1: event.offsetY,
        x2: event.offsetX,
        y2: event.offsetY
      }
      // Retorna o elemento mais próximo usando o zDepth
      const selectedElement = this.elements.reduce(
        (topEl, currentEl) => {
          if (currentEl.isBelowSelection(this.selection)) {
            if (!topEl || currentEl.zDepth > topEl.zDepth) {
              return currentEl
            }
          }
          return topEl
        },
        null as Element | null
      )

      if (selectedElement) {
        this.transformBox = new TransformBox([selectedElement], this.workAreaCanvas)
      } else {
        this.transformBox = null
      }

      this.selection = null
      this.mouseStatus = MouseStatus.UP
    }
    this.update()
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
    if (this.transformBox) {
      this.transformBox.draw(this.context)
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
    const x = Math.floor(Math.random() * (this.workAreaCanvas.width - width))
    const y = Math.floor(Math.random() * (this.workAreaCanvas.height - height))
    const newElement = new Element({ x, y }, { width, height }, this.elements.length)
    this.elements.push(newElement)
    this.update()
  }

  public getCanvas(): HTMLCanvasElement {
    return this.workAreaCanvas
  }
}
