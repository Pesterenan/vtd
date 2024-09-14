import EVENT from '../../utils/customEvents';
import { Element } from '../element';
import { MOUSE_BUTTONS, MouseStatus, Position, TOOL } from '../types';
import { WorkArea } from '../workArea';
import { Tool } from './abstractTool';

export class RotateTool extends Tool {
  private startingPosition: Position | null = null;
  private centerPosition: Position | null = null;
  private lastRotation: number = 0;
  private toolIcon: HTMLImageElement | null = null;
  private selectedElements: Element[] | null = null;
  private resetParameters: { position: Position; rotation: number }[] | null = null;

  constructor(workArea: WorkArea) {
    super(workArea);
    this.toolIcon = new Image(12, 12);
    this.toolIcon.src = '../../components/transformBox/assets/centerHandleRotate.svg';
  }

  initializeTool(): void {
    if (!this.startingPosition && this.workArea.transformBox) {
      this.startingPosition = this.workArea.mouse.position;
      this.centerPosition = this.workArea.transformBox.getCenter();
      this.lastRotation = 0;
      this.selectedElements = this.workArea.getSelectedElements();
      if (this.selectedElements) {
        this.resetParameters = this.selectedElements.map((el) => ({
          position: { ...el.position },
          rotation: el.rotation
        }));
      }
      this.workArea.transformBox.centerHandle = this.toolIcon;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(): void {}

  handleMouseUp(event: MouseEvent): void {
    if (event.button === MOUSE_BUTTONS.LEFT) {
      console.log('Accept rotation');
    }
    if (event.button === MOUSE_BUTTONS.RIGHT) {
      if (this.selectedElements) {
        this.selectedElements.forEach((element, index) => {
          if (this.resetParameters) {
            element.position = this.resetParameters[index].position;
            element.rotation = this.resetParameters[index].rotation;
          }
        });
        console.log('Reset rotation');
      }
    }
    this.startingPosition = null;
    this.lastRotation = 0;
    this.workArea.mouse.status = MouseStatus.UP;
    this.workArea.currentTool = TOOL.SELECT;
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  handleMouseMove(event: MouseEvent): void {
    if (this.workArea.transformBox) {
      if (this.selectedElements && this.startingPosition) {
        const deltaX = event.offsetX - this.startingPosition.x;

        let angle = deltaX % 360;
        if (angle < 0) {
          angle += 360;
        }
        RotateTool.rotateSelectedElements(
          this.selectedElements,
          this.centerPosition,
          angle - this.lastRotation
        );
        this.lastRotation = angle;
      }
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}

  public static rotateSelectedElements(
    elements: Element[] | null,
    origin: Position | null,
    angle: number
  ): void {
    if (elements && origin) {
      const angleInRadians = (angle * Math.PI) / 180;
      elements.forEach((element) => {
        const deltaX = element.position.x - origin.x;
        const deltaY = element.position.y - origin.y;
        const newX = deltaX * Math.cos(angleInRadians) - deltaY * Math.sin(angleInRadians);
        const newY = deltaX * Math.sin(angleInRadians) + deltaY * Math.cos(angleInRadians);
        element.position.x = origin.x + newX;
        element.position.y = origin.y + newY;
        element.rotation += angleInRadians;
      });
    }
  }
}
