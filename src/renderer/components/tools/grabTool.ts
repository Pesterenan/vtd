import { Element } from '../element';
import { MOUSE_BUTTONS, MouseStatus, Position, TOOL } from '../types';
import { WorkArea } from '../workArea';
import { Tool } from './abstractTool';

export class GrabTool extends Tool {
  private startingPosition: Position | null = null;
  private lastPosition: Position | null = null;
  private toolIcon: HTMLImageElement | null = null;
  private selectedElements: Element[] | null = null;

  constructor(workArea: WorkArea) {
    super(workArea);
    this.toolIcon = new Image(12, 12);
    this.toolIcon.src = '../../components/transformBox/assets/centerHandleMove.svg';
  }

  initializeTool(): void {
    if (!this.startingPosition && this.workArea.transformBox) {
      this.startingPosition = this.workArea.adjustForZoom(this.workArea.mouse.position);
      this.lastPosition = this.startingPosition;
      this.selectedElements = this.workArea.getSelectedElements();
      this.workArea.transformBox.centerHandle = this.toolIcon;
      this.workArea.update();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(): void {}

  handleMouseUp(event: MouseEvent): void {
    if (event.button === MOUSE_BUTTONS.LEFT) {
      console.log('Accept position');
    }
    if (event.button === MOUSE_BUTTONS.RIGHT) {
      if (this.selectedElements) {
        this.selectedElements.forEach((element) => {
          if (this.startingPosition && this.lastPosition) {
            element.position.x += this.startingPosition.x - this.lastPosition.x;
            element.position.y += this.startingPosition.y - this.lastPosition.y;
          }
        });
        console.log('Reset position');
      }
    }
    this.startingPosition = null;
    this.lastPosition = null;
    this.workArea.mouse.status = MouseStatus.UP;
    this.workArea.currentTool = TOOL.SELECT;
    this.workArea.update();
  }

  handleMouseMove(event: MouseEvent): void {
    if (this.workArea.transformBox) {
      if (this.selectedElements && this.lastPosition) {
        const adjustedPosition = this.workArea.adjustForZoom({
          x: event.offsetX,
          y: event.offsetY
        });
        const delta = {
          x: adjustedPosition.x - this.lastPosition.x,
          y: adjustedPosition.y - this.lastPosition.y
        };
        GrabTool.moveSelectedElements(this.selectedElements, delta);
        this.lastPosition = adjustedPosition;
      }
      this.workArea.update();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}

  public static moveSelectedElements(elements: Element[] | null, delta: Position): void {
    if (elements) {
      elements.forEach((element) => {
        element.position.x += delta.x;
        element.position.y += delta.y;
      });
    }
  }
}
