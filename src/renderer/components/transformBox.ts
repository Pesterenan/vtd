import { BB } from '../utils/bb'
import { Element } from './element'
import { Position, Size } from './types'

export class TransformBox {
  private position: Position = { x: 0, y: 0 }
  private size: Size = { width: 0, height: 0 }
  private selectedElements: Element[] = []
  public isHandleDragging: boolean = false
  private lastMousePosition: Position | null = null
  private canvasOffset: Position
  private workAreaOffset: Position

  public constructor(
    selectedElements: Element[],
    canvas: HTMLCanvasElement,
    workAreaOffset: Position
  ) {
    this.selectedElements = selectedElements
    this.recalculateBoundingBox()
    this.canvasOffset = this.calculateCanvasOffset(canvas)
    this.workAreaOffset = workAreaOffset
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

  public getCenterHandlePosition(): Position {
    return {
      x: this.position.x + this.size.width / 2,
      y: this.position.y + this.size.height / 2
    }
  }

  public draw(context: CanvasRenderingContext2D): void {
    // Draw bounding box
    if (this.position && this.size) {
      context.strokeStyle = 'red'
      context.setLineDash([3, 3])
      context.lineWidth = 2
      context.strokeRect(
        this.position.x + this.workAreaOffset.x,
        this.position.y + this.workAreaOffset.y,
        this.size.width,
        this.size.height
      )
      context.strokeStyle = ''
      context.setLineDash([])
    }

    // Draw center handle
    const centerHandle = this.getCenterHandlePosition()
    context.fillStyle = 'blue'
    context.beginPath()
    context.arc(
      centerHandle.x + this.workAreaOffset.x,
      centerHandle.y + this.workAreaOffset.y,
      5,
      0,
      Math.PI * 2
    )
    context.fill()
    context.closePath()
  }

  public moveSelectedElements({ x, y }: Position): void {
    this.selectedElements.forEach((element) => {
      element.position.x += x
      element.position.y += y
    })
    this.recalculateBoundingBox()
  }

  public handleMouseDown(event: MouseEvent): void {
    console.log('mouse up transform box')
    const { offsetX, offsetY } = this.getMousePosition(event)
    const centerHandle = this.getCenterHandlePosition()
    const distance = Math.hypot(centerHandle.x - offsetX, centerHandle.y - offsetY)

    if (distance <= 5) {
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
        x1: this.getCenterHandlePosition().x - 5,
        x2: this.getCenterHandlePosition().x + 5,
        y1: this.getCenterHandlePosition().y - 5,
        y2: this.getCenterHandlePosition().y + 5
      }).isPointWithinBB({ x: offsetX, y: offsetY })
    ) {
      console.log('it is on handle')
    }
    this.isHandleDragging = false
    this.lastMousePosition = null
  }
}
