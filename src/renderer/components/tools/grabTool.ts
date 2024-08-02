import { Element } from '../element'
import { MOUSE_BUTTONS, MouseStatus, Position, TOOL } from '../types'
import { WorkArea } from '../workArea'
import { Tool } from './abstractTool'

export class GrabTool extends Tool {
  private startingPosition: Position | null = null
  private lastPosition: Position | null = null
  private toolIcon: HTMLImageElement | null = null
  private selectedElements: Element[] | null = null

  constructor(workArea: WorkArea) {
    super(workArea)
    this.toolIcon = new Image(24, 24)
    this.toolIcon.src = '../transformBox/assets/centerHandleMove.svg'
  }

  initializeTool(): void {
    if (!this.startingPosition && this.workArea.transformBox) {
      this.startingPosition = this.workArea.adjustForZoom(this.workArea.mouse.position)
      this.lastPosition = this.startingPosition
      console.log(this.startingPosition)
      //this.workArea.transformBox.centerHandle = this.toolIcon
      this.selectedElements = this.workArea.getSelectedElements()
      console.log(this.selectedElements)
      this.workArea.update()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(): void {}

  handleMouseUp(event: MouseEvent): void {
    if (event.button === MOUSE_BUTTONS.LEFT) {
      console.log('Accept position')
    }
    if (event.button === MOUSE_BUTTONS.RIGHT) {
      if (this.selectedElements) {
        this.selectedElements.forEach((element) => {
          if (this.startingPosition && this.lastPosition) {
            element.position.x += this.startingPosition.x - this.lastPosition.x
            element.position.y += this.startingPosition.y - this.lastPosition.y
          }
        })
        console.log('Reset position')
      }
    }
    this.startingPosition = null
    this.lastPosition = null
    this.workArea.mouse.status = MouseStatus.UP
    this.workArea.currentTool = TOOL.SELECT
    this.workArea.update()
  }

  handleMouseMove(event: MouseEvent): void {
    if (this.workArea.transformBox) {
      if (this.selectedElements && this.lastPosition) {
        const adjustedPosition = this.workArea.adjustForZoom({ x: event.offsetX, y: event.offsetY })
        const deltaX = adjustedPosition.x - this.lastPosition.x
        const deltaY = adjustedPosition.y - this.lastPosition.y
        this.selectedElements.forEach((element) => {
          element.position.x += deltaX
          element.position.y += deltaY
        })
        this.lastPosition = adjustedPosition
      }
      this.workArea.update()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
