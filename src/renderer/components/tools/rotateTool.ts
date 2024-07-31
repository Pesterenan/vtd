import { Element } from '../element'
import { MOUSE_BUTTONS, MouseStatus, Position, TOOL } from '../types'
import { WorkArea } from '../workArea'
import { Tool } from './abstractTool'

export class RotateTool extends Tool {
  private startingPosition: Position | null = null
  private centerPosition: Position | null = null
  private rotation: number = 0
  private toolIcon: HTMLImageElement | null = null
  private selectedElements: Element[] | null = null
  private resetParameters: { position: Position; rotation: number }[] | null = null

  constructor(workArea: WorkArea) {
    super(workArea)
    this.toolIcon = new Image(24, 24)
    this.toolIcon.src = '../transformBox/assets/centerHandleRotate.svg'
  }

  initializeTool(): void {
    if (!this.startingPosition && this.workArea.transformBox) {
      this.startingPosition = this.workArea.adjustForZoom(this.workArea.mouse.position)
      this.centerPosition = this.workArea.transformBox.getCenter()
      //this.workArea.transformBox.centerHandle = this.toolIcon
      this.selectedElements = this.workArea.getSelectedElements()
      if (this.selectedElements) {
        this.resetParameters = this.selectedElements.map((el) => ({
          position: el.position,
          rotation: el.rotation
        }))
      }
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
        if (this.workArea.transformBox) {
          this.selectedElements.forEach((element, index) => {
            if (this.resetParameters) {
              element.position = this.resetParameters[index].position
              element.rotation = this.resetParameters[index].rotation
            }
          })
        }
        console.log('Reset position')
      }
    }
    this.startingPosition = null
    this.workArea.mouse.status = MouseStatus.UP
    this.workArea.currentTool = TOOL.SELECT
    this.workArea.update()
  }

  handleMouseMove(event: MouseEvent): void {
    if (this.workArea.transformBox) {
      if (this.selectedElements && this.startingPosition) {
        const adjustedPosition = this.workArea.adjustForZoom({ x: event.offsetX, y: event.offsetY })
        const deltaX = adjustedPosition.x - this.startingPosition.x

        let angle = deltaX % 360
        if (angle < 0) {
          angle += 360
        }
        const angleInRadians = ((angle - this.rotation) * Math.PI) / 180
        this.selectedElements.forEach((element) => {
          if (this.centerPosition) {
            const deltaX = element.position.x - this.centerPosition.x
            const deltaY = element.position.y - this.centerPosition.y
            const newX = deltaX * Math.cos(angleInRadians) - deltaY * Math.sin(angleInRadians)
            const newY = deltaX * Math.sin(angleInRadians) + deltaY * Math.cos(angleInRadians)
            element.position.x = this.centerPosition.x + newX
            element.position.y = this.centerPosition.y + newY
            element.rotation += angleInRadians
          }
        })
        this.rotation = angle
      }
      this.workArea.update()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
