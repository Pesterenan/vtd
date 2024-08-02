import { Element } from '../element'
import { MOUSE_BUTTONS, MouseStatus, Position, Scale, TOOL } from '../types'
import { WorkArea } from '../workArea'
import { Tool } from './abstractTool'

export class ScaleTool extends Tool {
  private startingPosition: Position | null = null
  private centerPosition: Position | null = null
  private lastPosition: Position | null = null
  private toolIcon: HTMLImageElement | null = null
  private selectedElements: Element[] | null = null
  private resetParameters: { position: Position; scale: Scale }[] | null = null

  constructor(workArea: WorkArea) {
    super(workArea)
    this.toolIcon = new Image(24, 24)
    this.toolIcon.src = '../transformBox/assets/centerHandleScale.svg'
  }

  initializeTool(): void {
    if (!this.startingPosition && this.workArea.transformBox) {
      this.startingPosition = this.workArea.adjustForZoom(this.workArea.mouse.position)
      this.centerPosition = this.workArea.transformBox.getCenter()
      this.lastPosition = this.startingPosition
      //this.workArea.transformBox.centerHandle = this.toolIcon
      this.selectedElements = this.workArea.getSelectedElements()
      if (this.selectedElements) {
        this.resetParameters = this.selectedElements.map((el) => ({
          position: { ...el.position },
          scale: { ...el.scale }
        }))
      }
      this.workArea.update()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(): void {}

  handleMouseUp(event: MouseEvent): void {
    if (event.button === MOUSE_BUTTONS.LEFT) {
      console.log('Accept scale')
    }
    if (event.button === MOUSE_BUTTONS.RIGHT) {
      if (this.selectedElements) {
        this.selectedElements.forEach((element, index) => {
          if (this.resetParameters) {
            element.position = this.resetParameters[index].position
            element.scale = this.resetParameters[index].scale
          }
        })
        console.log('Reset scale')
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
        const scaleX = 1 + deltaX / 4 / 100
        const scaleY = 1 + deltaY / 4 / 100
        this.selectedElements.forEach((element) => {
          if (this.centerPosition) {
            const newX = element.position.x - this.centerPosition.x
            const newY = element.position.y - this.centerPosition.y
            element.scale.x *= scaleX
            element.scale.y *= scaleY
            element.position.x = this.centerPosition.x + newX * scaleX
            element.position.y = this.centerPosition.y + newY * scaleY
          }
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
