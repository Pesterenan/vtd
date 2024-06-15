import { BB } from '../../utils/bb'
import { Element } from '../element'
import { Position, Size } from '../types'

export class TransformBox {
  private position: Position = { x: 0, y: 0 }
  private size: Size = { width: 0, height: 0 }
  private selectedElements: Element[] = []
  public isHandleDragging: boolean = false
  private lastMousePosition: Position | null = null
  private canvasOffset: Position
  private workAreaOffset: Position
  private isMoving: boolean = false
  private isRotating: boolean = false
  private rotation: number = 0
  private context: CanvasRenderingContext2D | null
  private IconMove: HTMLImageElement
  private IconRotate: HTMLImageElement
  private centerHandle: HTMLImageElement | null = null

  public constructor(
    selectedElements: Element[],
    canvas: HTMLCanvasElement,
    workAreaOffset: Position
  ) {
    this.context = canvas.getContext('2d')
    this.selectedElements = selectedElements
    this.recalculateBoundingBox()
    this.canvasOffset = this.calculateCanvasOffset(canvas)
    this.workAreaOffset = workAreaOffset
    this.IconMove = new Image(24, 24)
    this.IconMove.src = '../../components/transformBox/assets/centerHandleMove.svg'
    this.IconRotate = new Image(24, 24)
    this.IconRotate.src = '../../components/transformBox/assets/centerHandleRotate.svg'
  }

  private calculateCanvasOffset(canvas: HTMLCanvasElement): Position {
    const rect = canvas.getBoundingClientRect()
    return { x: rect.left, y: rect.top }
  }

  private getMousePosition(event: MouseEvent): { offsetX: number; offsetY: number } {
    const offsetX = event.clientX - this.canvasOffset.x - this.workAreaOffset.x
    const offsetY = event.clientY - this.canvasOffset.y - this.workAreaOffset.y
    return { offsetX, offsetY }
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

  public moveSelectedElements({ x, y }: Position): void {
    this.selectedElements.forEach((element) => {
      element.position.x += x
      element.position.y += y
    })
    this.recalculateBoundingBox()
  }

  public handleMouseDown(event: MouseEvent): void {
    const { offsetX, offsetY } = this.getMousePosition(event)
    const centerHandle = this.getCenter(false)
    const distance = Math.hypot(centerHandle.x - offsetX, centerHandle.y - offsetY)

    if (distance <= 5) {
      this.centerHandle = this.IconMove
      this.isHandleDragging = true
      this.lastMousePosition = { x: offsetX, y: offsetY }
      event.stopPropagation()
    }
  }

  public handleMouseMove(event: MouseEvent): void {
    if (!this.isHandleDragging || !this.lastMousePosition) return

    const { offsetX, offsetY } = this.getMousePosition(event)
    const dx = offsetX - this.lastMousePosition.x
    const dy = offsetY - this.lastMousePosition.y

    this.moveSelectedElements({ x: dx, y: dy })
    this.lastMousePosition = { x: offsetX, y: offsetY }
  }

  public handleMouseUp(event: MouseEvent): void {
    const { offsetX, offsetY } = this.getMousePosition(event)
    if (
      new BB({
        x1: this.getCenter(false).x - 5,
        x2: this.getCenter(false).x + 5,
        y1: this.getCenter(false).y - 5,
        y2: this.getCenter(false).y + 5
      }).isPointWithinBB({ x: offsetX, y: offsetY })
    ) {
      console.log('it is on handle')
    }
    this.isHandleDragging = false
    this.lastMousePosition = null
    this.centerHandle = null
  }

  public startMove({ x, y }: Position): void {
    this.lastMousePosition = { x, y }
    this.isMoving = true
    this.centerHandle = this.IconMove
  }

  public move(currentMousePosition: Position): void {
    if (!this.isMoving || !this.lastMousePosition) return

    const { x: offsetX, y: offsetY } = currentMousePosition

    const dx = offsetX - this.lastMousePosition.x
    const dy = offsetY - this.lastMousePosition.y

    this.moveSelectedElements({ x: dx, y: dy })
    this.lastMousePosition = { x: offsetX, y: offsetY }
  }

  public endMove(): void {
    this.isMoving = false
    this.lastMousePosition = null
  }

  private rotateSelectedElements(angle: number): void {
    const center = this.getCenter(false)
    const angleInRadians = (angle * Math.PI) / 180
    this.selectedElements.forEach((element) => {
      const dx = element.position.x - center.x
      const dy = element.position.y - center.y
      const newX = dx * Math.cos(angleInRadians) - dy * Math.sin(angleInRadians)
      const newY = dx * Math.sin(angleInRadians) + dy * Math.cos(angleInRadians)
      element.position.x = center.x + newX
      element.position.y = center.y + newY
      element.rotation = element.rotation + angleInRadians
    })
  }

  public startRotate({ x, y }: Position): void {
    this.lastMousePosition = { x, y }
    this.isRotating = true
    this.centerHandle = this.IconRotate
  }

  public rotate(currentMousePosition: Position): void {
    if (!this.isRotating || !this.lastMousePosition) return

    const { x: offsetX } = currentMousePosition
    const dx = offsetX - this.lastMousePosition.x
    let angle = dx % 360
    if (angle < 0) {
      angle += 360
    }

    this.rotateSelectedElements(angle - this.rotation)
    this.rotation = angle
  }

  public endRotate(): void {
    this.isRotating = false
    this.rotation = 0
    this.lastMousePosition = null
  }
}
