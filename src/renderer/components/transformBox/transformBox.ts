import { BB } from '../../utils/bb'
import { Element } from '../element'
import { Position, Size, TOOL } from '../types'
import { WorkArea } from '../workArea'

export class TransformBox {
  private position: Position = { x: 0, y: 0 }
  private size: Size = { width: 0, height: 0 }
  private selectedElements: Element[] = []
  public isHandleDragging: boolean = false
  private lastMousePosition: Position | null = null
  private workAreaOffset: Position
  private rotation: number = 0
  private context: CanvasRenderingContext2D | null
  private IconMove: HTMLImageElement
  private IconRotate: HTMLImageElement
  private centerHandle: HTMLImageElement | null = null
  private isTransforming: boolean = false
  private currentTool: TOOL = TOOL.SELECT

  public constructor(selectedElements: Element[], canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')
    this.selectedElements = selectedElements
    this.recalculateBoundingBox()
    this.workAreaOffset = WorkArea.getInstance().getWorkAreaOffset()
    this.IconMove = new Image(24, 24)
    this.IconMove.src = '../../components/transformBox/assets/centerHandleMove.svg'
    this.IconRotate = new Image(24, 24)
    this.IconRotate.src = '../../components/transformBox/assets/centerHandleRotate.svg'
  }

  private getMousePosition(event: MouseEvent): Position {
    return { x: event.clientX, y: event.clientY }
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

  /** Returns the center of the transform box
   * @param {boolean} withOffset - includes workAreaOffset if true
   */
  public getCenter(withOffset: boolean = true): Position {
    if (withOffset) {
      this.workAreaOffset = WorkArea.getInstance().getWorkAreaOffset()
      return {
        x: this.position.x + this.size.width / 2 + this.workAreaOffset.x,
        y: this.position.y + this.size.height / 2 + this.workAreaOffset.y
      }
    }
    return {
      x: this.position.x + this.size.width / 2,
      y: this.position.y + this.size.height / 2
    }
  }

  public draw(): void {
    if (!this.context) return
    const centerPos = this.getCenter()

    // Draw bounding box
    this.context.save()
    this.context.translate(centerPos.x, centerPos.y)
    this.context.rotate(this.rotation * (Math.PI / 180))
    this.context.translate(-centerPos.x, -centerPos.y)
    this.context.strokeStyle = 'red'
    this.context.setLineDash([3, 3])
    this.context.lineWidth = 2
    this.context.strokeRect(
      this.position.x + this.workAreaOffset.x,
      this.position.y + this.workAreaOffset.y,
      this.size.width,
      this.size.height
    )
    this.context.restore()

    // Draw centerHandle
    if (this.centerHandle) {
      this.context.drawImage(
        this.centerHandle,
        centerPos.x - this.centerHandle.width / 2,
        centerPos.y - this.centerHandle.height / 2,
        this.centerHandle.width,
        this.centerHandle.height
      )
    }
  }

  public handleMouseDown(event: MouseEvent): void {
    const { x, y } = this.getMousePosition(event)
    const centerHandle = this.getCenter()
    const distance = Math.hypot(centerHandle.x - x, centerHandle.y - y)

    if (distance <= 5) {
      this.startTransform(TOOL.GRAB, { x, y })
      this.isHandleDragging = true
      event.stopPropagation()
    }
  }

  public handleMouseMove(event: MouseEvent): void {
    console.log(`TransformBox, mouse move`)
    const { x, y } = this.getMousePosition(event)
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

  public handleMouseUp(event: MouseEvent): void {
    console.log(`TransformBox, mouse up`)
    const { x, y } = this.getMousePosition(event)
    if (
      new BB({
        x1: this.getCenter().x - 5,
        x2: this.getCenter().x + 5,
        y1: this.getCenter().y - 5,
        y2: this.getCenter().y + 5
      }).isPointWithinBB({ x, y })
    ) {
      console.log('it is on handle')
    }
    this.isHandleDragging = false
    this.endTransform()
  }

  // Tool transformations
  private moveSelectedElements({ x, y }: Position): void {
    this.selectedElements.forEach((element) => {
      element.position.x += x
      element.position.y += y
    })
    this.recalculateBoundingBox()
  }

  private rotateSelectedElements(angle: number): void {
    const center = this.getCenter(false)
    const angleInRadians = (angle * Math.PI) / 180
    this.selectedElements.forEach((element) => {
      const deltaX = element.position.x - center.x
      const deltaY = element.position.y - center.y
      const newX = deltaX * Math.cos(angleInRadians) - deltaY * Math.sin(angleInRadians)
      const newY = deltaX * Math.sin(angleInRadians) + deltaY * Math.cos(angleInRadians)
      element.position.x = center.x + newX
      element.position.y = center.y + newY
      element.rotation += angleInRadians
    })
  }

  public startTransform(tool: TOOL, { x, y }: Position): void {
    this.currentTool = tool
    this.lastMousePosition = { x, y }
    this.isTransforming = true
    switch (this.currentTool) {
      case TOOL.SELECT:
        break
      case TOOL.GRAB:
        this.centerHandle = this.IconMove
        break
      case TOOL.ROTATE:
        this.centerHandle = this.IconRotate
        break
      case TOOL.SCALE:
        break
    }
  }

  public transform(currentMousePosition: Position): void {
    if (!this.isTransforming || !this.lastMousePosition || this.currentTool === TOOL.SELECT) return
    const { x, y } = currentMousePosition
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
      console.log(angle, 'angle')

      this.rotateSelectedElements(angle - this.rotation)
      this.rotation = angle
    }
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
