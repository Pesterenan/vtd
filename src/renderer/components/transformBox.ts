import { Element } from './element'
import { handleStyle } from './transformBox/style'

export class TransformBox {
  private position: { x: number; y: number } = { x: 0, y: 0 }
  private size: { width: number; height: number } = { width: 0, height: 0 }
  private selectedElements: Element[] = []
  private handleElement: HTMLDivElement | null = null
  private isHandleDragging: boolean = false
  private lastMousePosition: { x: number; y: number } | null = null

  public constructor(selectedElements: Element[], parent: HTMLElement) {
    this.selectedElements = selectedElements
    this.recalculateBoundingBox()
    this.createHandleElement(parent)
  }

  private createHandleElement(parent): void {
    this.handleElement = document.createElement('div')
    this.handleElement.style.position = 'absolute'
    this.handleElement.style.width = '10px'
    this.handleElement.style.height = '10px'
    this.handleElement.style.backgroundColor = 'blue'
    this.handleElement.style.cursor = 'move'
    this.handleElement.style.display = 'none'
    parent.appendChild(this.handleElement)

    this.handleElement.addEventListener('mousedown', this.handleHandleMouseDown.bind(this))
    document.addEventListener('mousemove', this.handleHandleMouseMove.bind(this))
    document.addEventListener('mouseup', this.handleHandleMouseUp.bind(this))

    this.updateHandlePosition()
  }

  private handleHandleMouseDown(event: MouseEvent): void {
    event.stopPropagation()
    this.isHandleDragging = true
    this.lastMousePosition = { x: event.clientX, y: event.clientY }
  }

  private handleHandleMouseMove(event: MouseEvent): void {
    if (!this.isHandleDragging || !this.lastMousePosition) return

    const dx = event.clientX - this.lastMousePosition.x
    const dy = event.clientY - this.lastMousePosition.y

    this.moveSelectedElements(dx, dy)
    this.lastMousePosition = { x: event.clientX, y: event.clientY }

    this.updateHandlePosition()
  }

  private handleHandleMouseUp(): void {
    this.isHandleDragging = false
    this.lastMousePosition = null
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

  public getCenterHandlePosition(): { x: number; y: number } {
    return {
      x: this.position.x + this.size.width / 2,
      y: this.position.y + this.size.height / 2
    }
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (this.position && this.size) {
      context.strokeStyle = 'red'
      context.setLineDash([3, 3])
      context.lineWidth = 2
      context.strokeRect(this.position.x, this.position.y, this.size.width, this.size.height)
      context.strokeStyle = ''
      context.setLineDash([])
    }
  }

  public moveSelectedElements(dx: number, dy: number): void {
    this.selectedElements.forEach((element) => {
      element.position.x += dx
      element.position.y += dy
    })
    // Recalculate the TransformBox position and size
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    this.selectedElements.forEach(({ position: { x, y }, size: { width, height } }: Element) => {
      if (x < minX) {
        minX = x
      }
      if (y < minY) {
        minY = y
      }
      if (x + width > maxX) {
        maxX = x + width
      }
      if (y + height > maxY) {
        maxY = y + height
      }
    })

    this.position = { x: minX, y: minY }
    this.size = { width: maxX - minX, height: maxY - minY }
  }

  private updateHandlePosition(): void {
    if (!this.handleElement) return

    const { x, y } = this.getCenterHandlePosition()
    this.handleElement.style.left = `${x - 5}px` // Center the handle
    this.handleElement.style.top = `${y - 5}px` // Center the handle
    this.handleElement.style.display = 'block'
  }

  public removeHandleElement(): void {
    if (this.handleElement) {
      this.handleElement.remove()
      this.handleElement = null
    }
  }
}
