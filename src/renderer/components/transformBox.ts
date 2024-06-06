import { Element } from './element'
import { Position, Size } from './types'

export class TransformBox {
  private position: Position = { x: 0, y: 0 }
  private size: Size = { width: 0, height: 0 }
  private selectedElements: Element[] = []
  public isHandleDragging: boolean = false
  private lastMousePosition: Position | null = null
  private canvasOffset: Position

  public constructor(selectedElements: Element[], canvas: HTMLCanvasElement) {
    this.selectedElements = selectedElements
    this.recalculateBoundingBox()
    this.canvasOffset = this.calculateCanvasOffset(canvas)
  }

  private calculateCanvasOffset(canvas: HTMLCanvasElement): Position {
    const rect = canvas.getBoundingClientRect()
    return { x: rect.left, y: rect.top }
  }

  private getMousePosition(event: MouseEvent): { offsetX: number; offsetY: number } {
    const offsetX = event.clientX - this.canvasOffset.x
    const offsetY = event.clientY - this.canvasOffset.y
    return { offsetX, offsetY }
  }

  private recalculateBoundingBox(): void {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    this.selectedElements.forEach(({ position: { x, y }, size: { width, height } }: Element) => {
      if (x <= minX) {
        minX = x
      }
      if (y <= minY) {
        minY = y
      }

      if (x + width >= maxX) {
        maxX = x + width
      }
      if (y + height >= maxY) {
        maxY = y + height
      }
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
      context.strokeRect(this.position.x, this.position.y, this.size.width, this.size.height)
      context.strokeStyle = ''
      context.setLineDash([])
    }

    // Draw center handle
    const centerHandle = this.getCenterHandlePosition()
    context.fillStyle = 'blue'
    context.beginPath()
    context.arc(centerHandle.x, centerHandle.y, 5, 0, Math.PI * 2)
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

  public handleMouseUp(): void {
    this.isHandleDragging = false
    this.lastMousePosition = null
  }
}
