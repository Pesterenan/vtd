import { Element } from './element'
import { TransformBox } from './transformBox'
import { BoundingBox, MouseStatus, Rectangle } from './types'

const DRAGGING_DISTANCE = 5
const WORK_AREA_WIDTH = 480
const WORK_AREA_HEIGHT = 320

export class WorkArea {
  private static instance: WorkArea | null = null
  private mainCanvas: HTMLCanvasElement
  private workAreaCanvas: HTMLCanvasElement
  private mainContext: CanvasRenderingContext2D | null = null
  private workAreaContext: CanvasRenderingContext2D | null = null
  private elements: Element[] = []
  private mouseStatus: MouseStatus = MouseStatus.UP
  private selection: BoundingBox | null = null
  private transformBox: TransformBox | null = null
  private workArea: Rectangle

  private constructor() {
    this.mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement
    if (!this.mainCanvas) {
      throw new Error("Element with id 'main-canvas' was not found")
    }

    this.mainCanvas.width = window.innerWidth * 0.7
    this.mainCanvas.height = window.innerHeight
    this.mainCanvas.style.backgroundColor = 'grey'

    this.workAreaCanvas = document.createElement('canvas')
    this.workAreaCanvas.width = WORK_AREA_WIDTH
    this.workAreaCanvas.height = WORK_AREA_HEIGHT
    this.workAreaCanvas.style.backgroundColor = 'white'

    this.mainContext = this.mainCanvas.getContext('2d')
    this.workAreaContext = this.workAreaCanvas.getContext('2d')
    if (!this.mainContext || !this.workAreaContext) {
      throw new Error('Unable to get canvas context')
    }

    this.workArea = {
      x: this.mainCanvas.width / 2 - WORK_AREA_WIDTH / 2,
      y: this.mainCanvas.height / 2 - WORK_AREA_HEIGHT / 2,
      width: WORK_AREA_WIDTH,
      height: WORK_AREA_HEIGHT
    }
    this.createEventListeners()
    this.update()

    window.addEventListener('resize', this.handleResize.bind(this))
  }

  private createEventListeners(): void {
    this.mainCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this))
    this.mainCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.mainCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this))
  }

  private adjustSelectionForOffset(selection: BoundingBox): BoundingBox {
    return {
      x1: selection.x1 - this.workArea.x,
      y1: selection.y1 - this.workArea.y,
      x2: selection.x2 - this.workArea.x,
      y2: selection.y2 - this.workArea.y
    }
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
    if (this.transformBox && this.transformBox.isHandleDragging) {
      this.transformBox.handleMouseMove(event)
      this.update()
      return
    }

    if (this.selection) {
      const { offsetX, offsetY } = event
      this.selection.x2 = offsetX
      this.selection.y2 = offsetY
      if (this.mouseStatus === MouseStatus.MOVE) {
        this.update()
        if (this.mainContext) {
          const { x1, y1, x2, y2 } = this.selection
          this.mainContext.strokeStyle = 'black'
          this.mainContext.strokeRect(x1, y1, x2 - x1, y2 - y1)
        }
      }

      if (this.mouseStatus === MouseStatus.DOWN) {
        const distance = Math.hypot(
          this.selection.x2 - this.selection.x1,
          this.selection.y2 - this.selection.y1
        )
        if (distance > DRAGGING_DISTANCE) {
          this.mouseStatus = MouseStatus.MOVE
        }
      }
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (this.transformBox && this.transformBox.isHandleDragging) {
      this.transformBox.handleMouseUp(event)
      this.mouseStatus = MouseStatus.UP
      this.update()
      return
    }

    if (this.mouseStatus === MouseStatus.MOVE) {
      console.log('mouse up workarea')

      const adjustedSelection = this.adjustSelectionForOffset(this.selection as BoundingBox)
      const selectedElements = this.elements.filter((el) => el.isWithinBounds(adjustedSelection))
      if (selectedElements.length) {
        this.transformBox = new TransformBox(selectedElements, this.mainCanvas, {
          x: this.workArea.x,
          y: this.workArea.y
        })
      } else {
        this.transformBox = null
      }
      this.selection = null
      this.mouseStatus = MouseStatus.UP
    }

    if (this.mouseStatus === MouseStatus.DOWN) {
      this.selection = {
        x1: event.offsetX,
        y1: event.offsetY,
        x2: event.offsetX,
        y2: event.offsetY
      }

      const adjustedSelection = this.adjustSelectionForOffset(this.selection)
      const selectedElement = this.elements.reduce(
        (topEl, currentEl) => {
          if (currentEl.isBelowSelection(adjustedSelection)) {
            if (!topEl || currentEl.zDepth > topEl.zDepth) {
              return currentEl
            }
          }
          return topEl
        },
        null as Element | null
      )

      if (selectedElement) {
        this.transformBox = new TransformBox([selectedElement], this.mainCanvas, {
          x: this.workArea.x,
          y: this.workArea.y
        })
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

  private handleResize(): void {
    this.mainCanvas.width = window.innerWidth * 0.7
    this.mainCanvas.height = window.innerHeight
    this.workArea = {
      x: this.mainCanvas.width / 2 - WORK_AREA_WIDTH / 2,
      y: this.mainCanvas.height / 2 - WORK_AREA_HEIGHT / 2,
      width: WORK_AREA_WIDTH,
      height: WORK_AREA_HEIGHT
    }
    this.update()
  }

  public update(): void {
    if (!this.mainContext || !this.workAreaContext) {
      throw new Error('Canvas context is not available')
    }
    this.clearCanvas(this.mainContext, this.mainCanvas)
    this.clearCanvas(this.workAreaContext, this.workAreaCanvas)
    for (const element of this.elements) {
      element.draw(this.workAreaContext)
    }
    this.drawWorkArea()
    if (this.transformBox) {
      this.transformBox.draw(this.mainContext)
    }
  }

  private clearCanvas(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  private drawWorkArea(): void {
    if (this.mainContext) {
      this.mainContext.fillStyle = 'white'
      this.mainContext.fillRect(
        this.workArea.x,
        this.workArea.y,
        this.workArea.width,
        this.workArea.height
      )
      this.mainContext.strokeStyle = 'black'
      this.mainContext.strokeRect(
        this.workArea.x,
        this.workArea.y,
        this.workArea.width,
        this.workArea.height
      )
      this.mainContext.drawImage(this.workAreaCanvas, this.workArea.x, this.workArea.y)
    }
  }

  public addElement(): void {
    const width = 50
    const height = 50
    const x = Math.floor(Math.random() * (this.workArea.width - width))
    const y = Math.floor(Math.random() * (this.workArea.height - height))
    const newElement = new Element({ x, y }, { width, height }, this.elements.length)
    this.elements.push(newElement)
    this.update()
  }
}
