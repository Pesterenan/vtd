import { remap } from '../utils/easing'
import { Element } from './element'
import { SelectTool } from './tools/selectTool'
import { Tool } from './tools/toolAbstract'
import { TransformBox } from './transformBox/transformBox'
import { BoundingBox, IProjectData, MouseStatus, Position, TOOL } from './types'

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
  public mainCanvas: HTMLCanvasElement
  public mainContext: CanvasRenderingContext2D | null = null
  private elements: Element[] = []
  private transformBox: TransformBox | null = null
  private zoomLevel: number = 0.3
  private workArea: IWorkAreaProperties | Record<string, never>
  private mouse: IMouseProperties
  private tools: { [key in TOOL]: Tool }
  private currentTool: TOOL = TOOL.SELECT

  private constructor() {
    this.mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement
    if (!this.mainCanvas) {
      throw new Error("Element with id 'main-canvas' was not found")
    }
    this.tools = {
      [TOOL.SELECT]: new SelectTool(this),
      [TOOL.GRAB]: new SelectTool(this),
      [TOOL.HAND]: new SelectTool(this),
      [TOOL.ZOOM]: new SelectTool(this),
      [TOOL.SCALE]: new SelectTool(this),
      [TOOL.ROTATE]: new SelectTool(this)
    }

    this.mainCanvas.width = window.innerWidth * 0.7
    this.mainCanvas.height = window.innerHeight
    this.mainCanvas.style.backgroundColor = 'grey'

    const currentMousePosition = {
      x: this.mainCanvas.width * 0.5,
      y: this.mainCanvas.height * 0.5
    }
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

  public getMouse(): IMouseProperties {
    return this.mouse
  }

  private createEventListeners(): void {
    this.mainCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this))
    this.mainCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.mainCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this))
    window.addEventListener('keydown', this.handleKeyDown.bind(this))
    window.addEventListener('keypress', this.handleKeyPress.bind(this))
    window.addEventListener('keyup', this.handleKeyUp.bind(this))
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
      x: Number((mousePosition.x / this.zoomLevel).toFixed(0)),
      y: Number((mousePosition.y / this.zoomLevel).toFixed(0))
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    this.tools[this.currentTool].handleMouseDown(event)
  }

  private handleMouseMove(event: MouseEvent): void {
    const { offsetX, offsetY } = event
    const previousMousePosition = this.mouse.position
    const currentMousePosition = { x: offsetX, y: offsetY }
    const adjustedPosition = this.adjustForZoom(currentMousePosition)
    if (this.currentTool === TOOL.ZOOM) {
      const deltaX = currentMousePosition.x - previousMousePosition.x
      const newZoomLevel = remap(0, this.mainCanvas.width * 0.7, 0.1, 2.0, deltaX, true)
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
      this.update()
      return
    }

    if (this.transformBox) {
      this.transformBox.handleMouseMove(adjustedPosition)
      this.update()
      return
    }
  }

  private removeTransformBox(): void {
    if (this.transformBox) {
      this.transformBox.remove()
      this.transformBox = null
    }
  }

  private handleMouseUp(): void {
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

  public createTransformBox(selection: BoundingBox): void {
    let selectedElements: Element[] = []
    // If was using a selecting box
    if (this.mouse.status === MouseStatus.MOVE) {
      selectedElements = this.elements.filter((el: Element) => el.isWithinBounds(selection))
    }
    // If was just clicking on an element get the first one
    if (this.mouse.status === MouseStatus.DOWN) {
      selectedElements = [
        this.elements.reduce((topEl, currentEl) => {
          if (currentEl.isBelowSelection(selection)) {
            if (!topEl || currentEl.zDepth > topEl.zDepth) {
              return currentEl
            }
          }
          return topEl
        }, {} as Element)
      ]
    }
    // If there's elements selected, create TransformBox
    if (selectedElements.length) {
      this.transformBox = new TransformBox(selectedElements, this.mainCanvas)
    } else {
      this.removeTransformBox()
    }
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
