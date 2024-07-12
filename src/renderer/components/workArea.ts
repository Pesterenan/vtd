import { Element } from './element'
import { TransformBox } from './transformBox/transformBox'
import { BoundingBox, IProjectData, MouseStatus, Position, TOOL } from './types'

const DRAGGING_DISTANCE = 5
const WORK_AREA_WIDTH = 1920
const WORK_AREA_HEIGHT = 1080

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
  private currentTool: TOOL = TOOL.SELECT
  private currentMousePosition: Position
  private zoomLevel: number = 0.3

  private constructor() {
    this.mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement
    if (!this.mainCanvas) {
      throw new Error("Element with id 'main-canvas' was not found")
    }

    this.mainCanvas.width = window.innerWidth * 0.7
    this.mainCanvas.height = window.innerHeight
    this.mainCanvas.style.backgroundColor = 'grey'
    this.currentMousePosition = { x: this.mainCanvas.width * 0.5, y: this.mainCanvas.height * 0.5 }

    this.workAreaCanvas = document.createElement('canvas')
    this.workAreaCanvas.width = WORK_AREA_WIDTH
    this.workAreaCanvas.height = WORK_AREA_HEIGHT
    this.workAreaCanvas.style.backgroundColor = 'white'

    this.mainContext = this.mainCanvas.getContext('2d')
    this.workAreaContext = this.workAreaCanvas.getContext('2d')
    if (!this.mainContext || !this.workAreaContext) {
      throw new Error('Unable to get canvas context')
    }

    this.createEventListeners()
    this.update()

    window.addEventListener('resize', this.handleResize.bind(this))
  }

  public setZoomLevel(zoomLevel: number): void {
    this.zoomLevel = zoomLevel
    this.update()
  }

  public getZoomLevel(): number {
    return this.zoomLevel
  }

  private createEventListeners(): void {
    this.mainCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this))
    this.mainCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.mainCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this))
    window.addEventListener('keypress', this.handleKeyPress.bind(this))
  }

  private adjustSelectionForOffset(selection: BoundingBox): BoundingBox {
    const offset = this.getWorkAreaOffset()
    return {
      x1: (selection.x1 - offset.x) / this.zoomLevel,
      y1: (selection.y1 - offset.y) / this.zoomLevel,
      x2: (selection.x2 - offset.x) / this.zoomLevel,
      y2: (selection.y2 - offset.y) / this.zoomLevel
    }
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (this.transformBox && this.currentTool === TOOL.SELECT) {
      switch (event.code) {
        case 'KeyG':
          this.currentTool = TOOL.GRAB
          console.log('GRAB MODE, ACTIVATED!')
          break
        case 'KeyR':
          this.currentTool = TOOL.ROTATE
          console.log('ROTATE MODE, ACTIVATED!')
          break
        case 'KeyS':
          this.currentTool = TOOL.SCALE
          console.log('SCALE MODE, ACTIVATED!')
          break
        case 'KeyX':
          this.currentTool = TOOL.SELECT
          console.log('DELETED!')
          this.removeSelectedElements()
          return
      }
      this.transformBox.startTransform(this.currentTool, this.currentMousePosition)
      this.update()
    }
  }

  private removeSelectedElements(): void {
    if (this.transformBox) {
      this.elements = this.elements.filter((element) => !this.transformBox?.contains(element))
      this.transformBox = null
      this.update()
    }
  }

  private adjustForZoom(mousePosition: Position): Position {
    return {
      x: mousePosition.x / this.zoomLevel,
      y: mousePosition.y / this.zoomLevel
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    this.mouseStatus = MouseStatus.DOWN
    const { offsetX, offsetY } = event
    const adjustedPosition = this.adjustForZoom({ x: offsetX, y: offsetY })
    this.currentMousePosition = adjustedPosition
    console.log(`WorkArea, mouse down`, { ox: offsetX, oy: offsetY }, adjustedPosition)
    if (this.transformBox) {
      this.transformBox.handleMouseDown(event, this.currentMousePosition)
      if (this.transformBox.isHandleDragging) {
        return
      }
    }
    this.selection = { x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY }
  }

  private handleMouseMove(event: MouseEvent): void {
    const { offsetX, offsetY } = event
    const adjustedPosition = this.adjustForZoom({ x: offsetX, y: offsetY })
    this.currentMousePosition = adjustedPosition

    if (this.transformBox) {
      this.transformBox.handleMouseMove(this.currentMousePosition)
      this.update()
      return
    }

    if (this.selection) {
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
    const { offsetX, offsetY } = event
    if (this.transformBox) {
      this.transformBox.endTransform()
      this.transformBox.handleMouseUp()
      if (!this.transformBox.isHandleDragging) {
        this.transformBox = null
      }
      this.update()
      this.mouseStatus = MouseStatus.UP
      this.currentTool = TOOL.SELECT
    }
    if (this.mouseStatus === MouseStatus.MOVE) {
      const adjustedSelection = this.adjustSelectionForOffset(this.selection as BoundingBox)
      const selectedElements = this.elements.filter((el) => el.isWithinBounds(adjustedSelection))
      if (selectedElements.length) {
        this.transformBox = new TransformBox(selectedElements, this.mainCanvas)
      } else {
        this.transformBox = null
      }
      this.selection = null
      this.mouseStatus = MouseStatus.UP
    }

    if (this.mouseStatus === MouseStatus.DOWN) {
      this.selection = { x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY }

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
        this.transformBox = new TransformBox([selectedElement], this.mainCanvas)
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

  public loadProject(data: string): void {
    const projectData: IProjectData = JSON.parse(data)

    this.elements = projectData.elements.map((elData) => {
      const element = new Element(elData.position, elData.size, elData.zDepth)
      element.rotation = elData.rotation
      element.scale = elData.scale
      if (elData.imageSrc) {
        element.loadImage(elData.imageSrc, this.update.bind(this))
      }
      return element
    })

    this.update()
  }

  public saveProject(): string {
    const projectData = {
      elements: this.elements.map((el) => ({
        imageSrc: el.image?.src,
        position: el.position,
        rotation: el.rotation,
        scale: el.scale,
        size: el.size,
        zDepth: el.zDepth
      }))
    }
    return JSON.stringify(projectData)
  }

  private saveCanvas(canvas: HTMLCanvasElement): HTMLImageElement {
    const canvasContext = canvas.getContext('2d')
    const imageData = canvasContext!.getImageData(0, 0, canvas.width, canvas.height)

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempContext = tempCanvas.getContext('2d')
    tempContext?.putImageData(imageData, 0, 0)
    const image = new Image()
    image.src = tempCanvas.toDataURL()
    return image
  }

  private handleResize(): void {
    this.mainCanvas.width = window.innerWidth * 0.7
    this.mainCanvas.height = window.innerHeight
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
      this.transformBox.draw()
    }
  }

  private clearCanvas(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  public getWorkAreaOffset(): Position {
    return {
      x: (this.mainCanvas.width - this.workAreaCanvas.width * this.zoomLevel) * 0.5,
      y: (this.mainCanvas.height - this.workAreaCanvas.height * this.zoomLevel) * 0.5
    }
  }

  private drawWorkArea(): void {
    if (this.mainContext) {
      const offset = this.getWorkAreaOffset()
      this.mainContext.save()
      this.mainContext.translate(offset.x, offset.y)
      this.mainContext.scale(this.zoomLevel, this.zoomLevel)
      this.mainContext.fillStyle = 'white'
      this.mainContext.fillRect(0, 0, this.workAreaCanvas.width, this.workAreaCanvas.height)
      this.mainContext.strokeStyle = 'black'
      this.mainContext.strokeRect(0, 0, this.workAreaCanvas.width, this.workAreaCanvas.height)
      this.mainContext.drawImage(this.workAreaCanvas, 0, 0)
      this.mainContext.restore()
    }
  }

  public addElement(): void {
    const width = 50
    const height = 50
    // const x = Math.floor(Math.random() * this.workAreaCanvas.width) - width
    // const y = Math.floor(Math.random() * this.workAreaCanvas.height) - height
    const newElement = new Element({ x: 25, y: 25 }, { width, height }, this.elements.length)
    this.elements.push(newElement)
    this.update()
  }

  public addImageElement(filePath: string): void {
    const x = this.workAreaCanvas.width * 0.5
    const y = this.workAreaCanvas.height * 0.5
    const newElement = new Element({ x, y }, { width: 0, height: 0 }, this.elements.length)
    newElement.loadImage(filePath, this.update.bind(this))
    this.elements.push(newElement)
  }
}
