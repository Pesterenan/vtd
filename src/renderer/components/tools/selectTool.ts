import { BoundingBox, MouseStatus } from '../types'
import { WorkArea } from '../workArea'
import { Tool } from './abstractTool'

const DRAGGING_DISTANCE = 5

export class SelectTool extends Tool {
  private selection: BoundingBox | null = null

  constructor(workArea: WorkArea) {
    super(workArea)
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  initializeTool(): void {}

  private adjustSelectionForOffset(selection: BoundingBox): BoundingBox {
    const offset = this.workArea.offset
    const zoomLevel = this.workArea.zoomLevel
    return {
      x1: (selection.x1 - offset.x) / zoomLevel,
      y1: (selection.y1 - offset.y) / zoomLevel,
      x2: (selection.x2 - offset.x) / zoomLevel,
      y2: (selection.y2 - offset.y) / zoomLevel
    }
  }

  handleMouseDown(event: MouseEvent): void {
    const { offsetX, offsetY } = event
    this.workArea.mouse = { status: MouseStatus.DOWN }
    this.selection = { x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY }
  }

  handleMouseMove(event: MouseEvent): void {
    const { offsetX, offsetY } = event
    if (this.selection) {
      this.selection.x2 = offsetX
      this.selection.y2 = offsetY
      const { x1, y1, x2, y2 } = this.selection

      // Only start drawing if distance is higher than DRAGGING_DISTANCE
      if (this.workArea.mouse.status === MouseStatus.DOWN) {
        const distance = Math.hypot(x2 - x1, y2 - y1)
        if (distance > DRAGGING_DISTANCE) {
          this.workArea.mouse = { status: MouseStatus.MOVE }
        }
      }

      // Draw selection box:
      if (this.workArea.mouse.status === MouseStatus.MOVE) {
        this.workArea.update()
        if (this.workArea.mainContext) {
          this.workArea.mainContext.save()
          this.workArea.mainContext.strokeStyle = 'black'
          this.workArea.mainContext.setLineDash([3, 3])
          this.workArea.mainContext.strokeRect(x1, y1, x2 - x1, y2 - y1)
          this.workArea.mainContext.restore()
        }
      }
    }
  }

  handleMouseUp(): void {
    if (this.selection) {
      const adjustedSelection = this.adjustSelectionForOffset(this.selection)
      this.workArea.selectElements(adjustedSelection)
      this.workArea.createTransformBox()
      this.workArea.mouse = { status: MouseStatus.UP }
      this.selection = null
    }
    this.workArea.update()
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
