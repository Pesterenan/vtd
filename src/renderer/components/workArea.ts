import { remap } from '../utils/easing'
import { Element } from './element'
import { TransformBox } from './transformBox/transformBox'
import { BoundingBox, IProjectData, MouseStatus, Position, TOOL } from './types'

const DRAGGING_DISTANCE = 5
const WORK_AREA_WIDTH = 1920
const WORK_AREA_HEIGHT = 1080

interface IWorkAreaProperties {
  context: CanvasRenderingContext2D
  canvas: HTMLCanvasElement
  offset: Position
}

interface IMouseProperties {
  position: Position
  status: MouseStatus
}

export class WorkArea {
  private static instance: WorkArea | null = null
  private mainCanvas: HTMLCanvasElement
  private mainContext: CanvasRenderingContext2D | null = null
  private elements: Element[] = []
  private selection: BoundingBox | null = null
  private transformBox: TransformBox | null = null
  private currentTool: TOOL = TOOL.SELECT
  private zoomLevel: number = 0.3
  private workArea: IWorkAreaProperties | Record<string, never>
  private mouse: IMouseProperties | Record<string, never>

  private constructor() {
    this.mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement
    if (!this.mainCanvas) {
      throw new Error("Element with id 'main-canvas' was not found")
    }

    this.mainCanvas.width = window.innerWidth * 0.7
    this.mainCanvas.height = window.innerHeight
    this.mainCanvas.style.backgroundColor = 'grey'

    const currentMousePosition = { x: this.mainCanvas.width * 0.5, y: this.mainCanvas.height * 0.5 }
    this.mouse = {
      status: MouseStatus.UP,
      position: currentMousePosition
    }

    const workAreaCanvas = document.createElement('canvas')
    workAreaCanvas.width = WORK_AREA_WIDTH
    workAreaCanvas.height = WORK_AREA_HEIGHT
    workAreaCanvas.style.backgroundColor = 'white'
    const workAreaContext = workAreaCanvas.getContext('2d')
    const workAreaOffset = {
      x: this.mainCanvas.width * 0.5 - workAreaCanvas.width * this.zoomLevel * 0.5,
      y: this.mainCanvas.height * 0.5 - workAreaCanvas.height * this.zoomLevel * 0.5
    }

    this.mainContext = this.mainCanvas.getContext('2d')
    if (!this.mainContext || !workAreaContext) {
      throw new Error('Unable to get canvas context')
    }

    this.workArea = {
      canvas: workAreaCanvas,
      context: workAreaContext,
      offset: workAreaOffset
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
    window.addEventListener('keydown', this.handleKeyDown.bind(this))
    window.addEventListener('keypress', this.handleKeyPress.bind(this))
    window.addEventListener('keyup', this.handleKeyUp.bind(this))
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

  private handleKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyZ':
      case 'Space':
        this.currentTool = TOOL.SELECT
        console.log('SELECTING')
        return
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.currentTool === TOOL.SELECT) {
      switch (event.code) {
        case 'Space':
          console.log(this.mouse.position, 'mouse Pos')
          this.currentTool = TOOL.HAND
          console.log('MOVING')
          return
        case 'KeyZ':
          this.currentTool = TOOL.ZOOM
          console.log('ZOOMING')
          return
      }
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
      this.transformBox.startTransform(this.currentTool, this.adjustForZoom(this.mouse.position))
      this.update()
    }
  }

  private removeSelectedElements(): void {
    if (this.transformBox) {
      this.elements = this.elements.filter((element) => !this.transformBox?.contains(element))
      this.removeTransformBox()
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
    const { offsetX, offsetY } = event
    const currentMousePosition = { x: offsetX, y: offsetY }
    const adjustedPosition = this.adjustForZoom(currentMousePosition)
    this.mouse = {
      position: currentMousePosition,
      status: MouseStatus.DOWN
    }

    if (this.transformBox) {
      this.transformBox.handleMouseDown(event, adjustedPosition)
      if (this.transformBox.isHandleDragging) {
        return
      }
    }
    this.selection = {
      x1: currentMousePosition.x,
      y1: currentMousePosition.y,
      x2: currentMousePosition.x,
      y2: currentMousePosition.y
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const { offsetX, offsetY } = event
    const previousMousePosition = this.mouse.position
    const currentMousePosition = { x: offsetX, y: offsetY }
    const adjustedPosition = this.adjustForZoom(currentMousePosition)
    // TODO: Work on zooming in the mouse
    if (this.currentTool === TOOL.ZOOM) {
      const deltaX = currentMousePosition.x - previousMousePosition.x
      this.workArea.offset.x = deltaX
      const newZoomLevel = remap(0, this.mainCanvas.width, 0.1, 2.0, deltaX, true)
      console.log(deltaX, 'dx', newZoomLevel, 'nzl')
      this.setZoomLevel(newZoomLevel)
      this.update()
      return
    }

    this.mouse.position = currentMousePosition

    if (this.currentTool === TOOL.HAND && this.workArea.offset) {
      const deltaX = currentMousePosition.x - previousMousePosition.x
      const deltaY = currentMousePosition.y - previousMousePosition.y
      this.workArea.offset.x += deltaX
      this.workArea.offset.y += deltaY
      console.log(this.workArea.offset, currentMousePosition)
      this.update()
      return
    }

    if (this.transformBox) {
      this.transformBox.handleMouseMove(adjustedPosition)
      this.update()
      return
    }

    if (this.selection) {
      this.selection.x2 = offsetX
      this.selection.y2 = offsetY
      if (this.mouse.status === MouseStatus.MOVE) {
        this.update()
        if (this.mainContext) {
          const { x1, y1, x2, y2 } = this.selection
          this.mainContext.strokeStyle = 'black'
          this.mainContext.strokeRect(x1, y1, x2 - x1, y2 - y1)
        }
      }

      if (this.mouse.status === MouseStatus.DOWN) {
        const distance = Math.hypot(
          this.selection.x2 - this.selection.x1,
          this.selection.y2 - this.selection.y1
        )
        if (distance > DRAGGING_DISTANCE) {
          this.mouse.status = MouseStatus.MOVE
        }
      }
    }
  }

  private removeTransformBox(): void {
    if (this.transformBox) {
      this.transformBox.remove()
      this.transformBox = null
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    const { offsetX, offsetY } = event
    if (this.transformBox) {
      this.transformBox.endTransform()
      this.transformBox.handleMouseUp()
      if (!this.transformBox.isHandleDragging) {
        this.removeTransformBox()
      }
      this.update()
      this.mouse.status = MouseStatus.UP
      this.currentTool = TOOL.SELECT
    }
    if (this.mouse.status === MouseStatus.MOVE) {
      const adjustedSelection = this.adjustSelectionForOffset(this.selection as BoundingBox)
      const selectedElements = this.elements.filter((el) => el.isWithinBounds(adjustedSelection))
      if (selectedElements.length) {
        this.transformBox = new TransformBox(selectedElements, this.mainCanvas)
      } else {
        this.removeTransformBox()
      }
      this.selection = null
      this.mouse.status = MouseStatus.UP
    }

    if (this.mouse.status === MouseStatus.DOWN) {
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
        this.removeTransformBox()
      }

      this.selection = null
      this.mouse.status = MouseStatus.UP
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
      return Element.deserialize(elData)
    })
    this.update()
  }

  public saveProject(): string {
    const projectData = {
      elements: this.elements.map((el) => el.serialize())
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
    if (!this.mainContext || !this.workArea.context) {
      throw new Error('Canvas context is not available')
    }
    this.clearCanvas(this.mainContext, this.mainCanvas)
    this.clearCanvas(this.workArea.context, this.workArea.canvas)
    for (const element of this.elements) {
      element.draw(this.workArea.context)
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
      x: this.workArea.offset.x,
      y: this.workArea.offset.y
    }
  }

  private drawWorkArea(): void {
    if (this.mainContext) {
      const offset = this.getWorkAreaOffset()
      this.mainContext.save()
      this.mainContext.translate(offset.x, offset.y)
      this.mainContext.scale(this.zoomLevel, this.zoomLevel)
      this.mainContext.fillStyle = 'white'
      this.mainContext.fillRect(0, 0, this.workArea.canvas.width, this.workArea.canvas.height)
      this.mainContext.drawImage(this.workArea.canvas, 0, 0)
      this.mainContext.strokeStyle = 'black'
      this.mainContext.strokeRect(0, 0, this.workArea.canvas.width, this.workArea.canvas.height)
      this.mainContext.restore()
    }
  }

  public addElement(): void {
    const width = 50
    const height = 50
    const x = Math.floor(Math.random() * this.workArea.canvas.width) - width
    const y = Math.floor(Math.random() * this.workArea.canvas.height) - height
    const newElement = new Element({ x, y }, { width, height }, this.elements.length)
    this.elements.push(newElement)
    this.update()
  }

  public addImageElement(filePath: string): void {
    const x = this.workArea.canvas.width * 0.5
    const y = this.workArea.canvas.height * 0.5
    const newElement = new Element({ x, y }, { width: 0, height: 0 }, this.elements.length)
    newElement.loadImage(filePath, this.update.bind(this))
    this.elements.push(newElement)
  }
}
