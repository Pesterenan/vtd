import { Element } from '../element'
import { Position, Size, TOOL } from '../types'
import { WorkArea } from '../workArea'

export class TransformBox {
  private position: Position = { x: 0, y: 0 }
  private size: Size = { width: 0, height: 0 }
  private selectedElements: Element[] = []
  public isHandleDragging: boolean = false
  private lastMousePosition: Position | null = null
  private rotation: number = 0
  private context: CanvasRenderingContext2D | null
  private IconMove: HTMLImageElement
  private IconRotate: HTMLImageElement
  private IconScale: HTMLImageElement
  private IconSelect: HTMLImageElement
  private centerHandle: HTMLImageElement | null = null
  private isTransforming: boolean = false
  private currentTool: TOOL = TOOL.SELECT

  private xPosInput: { element: HTMLInputElement; listener: (event: Event) => void }
  private yPosInput: { element: HTMLInputElement; listener: (event: Event) => void }
  private widthSizeInput: { element: HTMLInputElement; listener: (event: Event) => void }
  private heightSizeInput: { element: HTMLInputElement; listener: (event: Event) => void }

  public constructor(selectedElements: Element[], canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')
    this.selectedElements = selectedElements
    this.recalculateBoundingBox()
    this.IconSelect = new Image(24, 24)
    this.IconSelect.src = '../../components/transformBox/assets/centerHandleSelect.svg'
    this.IconMove = new Image(24, 24)
    this.IconMove.src = '../../components/transformBox/assets/centerHandleMove.svg'
    this.IconRotate = new Image(24, 24)
    this.IconRotate.src = '../../components/transformBox/assets/centerHandleRotate.svg'
    this.IconScale = new Image(24, 24)
    this.IconScale.src = '../../components/transformBox/assets/centerHandleScale.svg'
    this.centerHandle = this.IconSelect

    this.xPosInput = {
      element: document.getElementById('x-pos-input') as HTMLInputElement,
      listener: this.updateTransformBoxPosition.bind(this)
    }
    this.yPosInput = {
      element: document.getElementById('y-pos-input') as HTMLInputElement,
      listener: this.updateTransformBoxPosition.bind(this)
    }
    this.widthSizeInput = {
      element: document.getElementById('width-size-input') as HTMLInputElement,
      listener: this.updateTransformBoxSize.bind(this)
    }
    this.heightSizeInput = {
      element: document.getElementById('height-size-input') as HTMLInputElement,
      listener: this.updateTransformBoxSize.bind(this)
    }

    this.createEventListeners()
    this.updateElementPropertiesMenu()
  }

  private createEventListeners(): void {
    this.xPosInput.element.addEventListener('input', this.xPosInput.listener)
    this.yPosInput.element.addEventListener('input', this.yPosInput.listener)
    this.widthSizeInput.element.addEventListener('input', this.widthSizeInput.listener)
    this.heightSizeInput.element.addEventListener('input', this.heightSizeInput.listener)
  }

  private removeEventListeners(): void {
    this.xPosInput.element.removeEventListener('input', this.xPosInput.listener)
    this.yPosInput.element.removeEventListener('input', this.yPosInput.listener)
    this.widthSizeInput.element.removeEventListener('input', this.widthSizeInput.listener)
    this.heightSizeInput.element.removeEventListener('input', this.heightSizeInput.listener)
  }

  private updateElementPropertiesMenu(): void {
    const center = this.getCenter()
    this.xPosInput.element.value = center.x.toFixed(0).toString()
    this.yPosInput.element.value = center.y.toFixed(0).toString()
    this.widthSizeInput.element.value = this.size.width.toFixed(0).toString()
    this.heightSizeInput.element.value = this.size.height.toFixed(0).toString()
  }

  private updateTransformBoxPosition(): void {
    const center = this.getCenter()
    const deltaX = parseFloat(this.xPosInput.element.value) - center.x
    const deltaY = parseFloat(this.yPosInput.element.value) - center.y
    this.position.x += deltaX
    this.position.y += deltaY
    this.moveSelectedElements({ x: deltaX, y: deltaY })
    this.updateElementPropertiesMenu()
    WorkArea.getInstance().update()
  }

  private updateTransformBoxSize(): void {
    this.size.width = parseFloat(this.widthSizeInput.element.value)
    this.size.height = parseFloat(this.heightSizeInput.element.value)
    WorkArea.getInstance().update()
  }

  public contains(element: Element): boolean {
    return !!this.selectedElements.find((el) => el.zDepth === element.zDepth)
  }

  private recalculateBoundingBox(): void {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    this.selectedElements.forEach((element: Element) => {
      const boundingBox = element.getTransformedBoundingBox()
      if (boundingBox.x1 < minX) minX = boundingBox.x1
      if (boundingBox.y1 < minY) minY = boundingBox.y1
      if (boundingBox.x2 > maxX) maxX = boundingBox.x2
      if (boundingBox.y2 > maxY) maxY = boundingBox.y2
    })

    this.position = { x: minX, y: minY }
    this.size = { width: maxX - minX, height: maxY - minY }
  }

  /** Returns the center of the transform box */
  public getCenter(): Position {
    return {
      x: this.position.x + this.size.width * 0.5,
      y: this.position.y + this.size.height * 0.5
    }
  }

  public draw(): void {
    if (!this.context) return
    this.recalculateBoundingBox()
    const centerPosition = this.getCenter()
    const workAreaZoom = WorkArea.getInstance().getZoomLevel()
    const workAreaOffset = WorkArea.getInstance().getWorkAreaOffset()

    // Draw bounding box
    this.context.save()
    this.context.translate(workAreaOffset.x, workAreaOffset.y)
    this.context.scale(workAreaZoom, workAreaZoom)
    //
    // this.context.translate(centerPos.x, centerPos.y)
    // this.context.rotate(this.rotation * (Math.PI / 180))
    // this.context.translate(-centerPos.x, -centerPos.y)

    this.context.strokeStyle = 'red'
    this.context.setLineDash([3 / workAreaZoom, 3 / workAreaZoom])
    this.context.lineWidth = 2 / workAreaZoom
    this.context.strokeRect(this.position.x, this.position.y, this.size.width, this.size.height)

    // Draw centerHandle
    if (this.centerHandle) {
      this.context.drawImage(
        this.centerHandle,
        centerPosition.x - (this.centerHandle.width * 0.5) / workAreaZoom,
        centerPosition.y - (this.centerHandle.height * 0.5) / workAreaZoom,
        this.centerHandle.width / workAreaZoom,
        this.centerHandle.height / workAreaZoom
      )
    }
    this.context.restore()
  }

  public handleMouseDown(event: MouseEvent, { x, y }: Position): void {
    const centerPosition = this.getCenter()
    const workAreaOffset = WorkArea.getInstance().getWorkAreaOffset()
    const distance = Math.hypot(
      centerPosition.x - x + workAreaOffset.x,
      centerPosition.y - y + workAreaOffset.y
    )
    console.log('distance', distance)

    if (distance <= 10) {
      this.startTransform(TOOL.GRAB, { x, y })
      this.isHandleDragging = true
      event.stopPropagation()
    }
  }

  public handleMouseMove({ x, y }: Position): void {
    if (this.isTransforming) {
      this.transform({ x, y })
      return
    }

    if (!this.isHandleDragging || !this.lastMousePosition) return

    const deltaX = x - this.lastMousePosition.x
    const deltaY = y - this.lastMousePosition.y

    this.moveSelectedElements({ x: deltaX, y: deltaY })
    this.lastMousePosition = { x, y }
  }

  public remove(): void {
    this.removeEventListeners()
  }

  public handleMouseUp(): void {
    this.isHandleDragging = false
    this.endTransform()
  }

  // Tool transformations
  private moveSelectedElements({ x, y }: Position): void {
    this.selectedElements.forEach((element) => {
      element.position.x += x
      element.position.y += y
    })
  }

  private rotateSelectedElements(angle: number): void {
    const centerPosition = this.getCenter()
    const angleInRadians = (angle * Math.PI) / 180
    this.selectedElements.forEach((element) => {
      const deltaX = element.position.x - centerPosition.x
      const deltaY = element.position.y - centerPosition.y
      const newX = deltaX * Math.cos(angleInRadians) - deltaY * Math.sin(angleInRadians)
      const newY = deltaX * Math.sin(angleInRadians) + deltaY * Math.cos(angleInRadians)
      element.position.x = centerPosition.x + newX
      element.position.y = centerPosition.y + newY
      element.rotation += angleInRadians
    })
  }

  private scaleSelectedElements(scaleFactor: number): void {
    const centerPosition = this.getCenter()
    this.selectedElements.forEach((element) => {
      const deltaX = element.position.x - centerPosition.x
      const deltaY = element.position.y - centerPosition.y
      // Update element scale
      element.scale.x *= scaleFactor
      element.scale.y *= scaleFactor
      // Update element position
      element.position.x = centerPosition.x + deltaX * scaleFactor
      element.position.y = centerPosition.y + deltaY * scaleFactor
    })
  }

  public startTransform(tool: TOOL, { x, y }: Position): void {
    this.currentTool = tool
    this.lastMousePosition = { x, y }
    this.isTransforming = true
    switch (this.currentTool) {
      case TOOL.SELECT:
        this.centerHandle = this.IconSelect
        break
      case TOOL.GRAB:
        this.centerHandle = this.IconMove
        break
      case TOOL.ROTATE:
        this.centerHandle = this.IconRotate
        break
      case TOOL.SCALE:
        this.centerHandle = this.IconScale
        break
    }
  }

  public transform({ x, y }: Position): void {
    if (!this.isTransforming || !this.lastMousePosition || this.currentTool === TOOL.SELECT) return
    const deltaX = x - this.lastMousePosition.x
    const deltaY = y - this.lastMousePosition.y

    if (this.currentTool === TOOL.GRAB) {
      this.moveSelectedElements({ x: deltaX, y: deltaY })
      this.lastMousePosition = { x, y }
    }
    if (this.currentTool === TOOL.ROTATE) {
      let angle = deltaX % 360
      if (angle < 0) {
        angle += 360
      }
      this.rotateSelectedElements(angle - this.rotation)
      this.rotation = angle
    }
    if (this.currentTool === TOOL.SCALE) {
      const scaleFactor = 1 + deltaX / 100
      this.scaleSelectedElements(scaleFactor)
      this.lastMousePosition = { x, y }
    }
    this.updateElementPropertiesMenu()
  }

  public endTransform(): void {
    this.isHandleDragging = false
    this.isTransforming = false
    this.lastMousePosition = null
    this.currentTool = TOOL.SELECT
    this.centerHandle = null
    this.rotation = 0
  }
}
