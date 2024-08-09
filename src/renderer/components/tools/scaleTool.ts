import { Element } from '../element';
import { MOUSE_BUTTONS, MouseStatus, Position, Scale, TOOL } from '../types';
import { WorkArea } from '../workArea';
import { Tool } from './abstractTool';

export class ScaleTool extends Tool {
  private startingPosition: Position | null = null;
  private centerPosition: Position | null = null;
  private lastPosition: Position | null = null;
  private toolIcon: HTMLImageElement | null = null;
  private selectedElements: Element[] | null = null;
  private resetParameters: { position: Position; scale: Scale }[] | null = null;

  constructor(workArea: WorkArea) {
    super(workArea);
    this.toolIcon = new Image(12, 12);
    this.toolIcon.src = '../../components/transformBox/assets/centerHandleScale.svg';
  }

  initializeTool(): void {
    if (!this.startingPosition && this.workArea.transformBox) {
      this.startingPosition = this.workArea.mouse.position;
      this.centerPosition = this.workArea.transformBox.getCenter();
      this.lastPosition = this.startingPosition;
      this.selectedElements = this.workArea.getSelectedElements();
      if (this.selectedElements) {
        this.resetParameters = this.selectedElements.map((el) => ({
          position: { ...el.position },
          scale: { ...el.scale }
        }));
      }
      this.workArea.transformBox.centerHandle = this.toolIcon;
      this.workArea.update();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(): void {}

  handleMouseUp(event: MouseEvent): void {
    if (event.button === MOUSE_BUTTONS.LEFT) {
      console.log('Accept scale');
    }
    if (event.button === MOUSE_BUTTONS.RIGHT) {
      if (this.selectedElements) {
        this.selectedElements.forEach((element, index) => {
          if (this.resetParameters) {
            element.position = this.resetParameters[index].position;
            element.scale = this.resetParameters[index].scale;
          }
        });
        console.log('Reset scale');
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
        const deltaX = event.offsetX - this.lastPosition.x;
        const deltaY = event.offsetY - this.lastPosition.y;
        const delta = { x: 1 + deltaX / 100, y: 1 + deltaY / 100 };
        ScaleTool.scaleSelectedElements(this.selectedElements, this.centerPosition, delta);
        this.lastPosition = {
          x: event.offsetX,
          y: event.offsetY
        };
      }
      this.workArea.update();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}

  public static scaleSelectedElements(
    elements: Element[] | null,
    origin: Position | null,
    delta: Scale | null
  ): void {
    if (elements && origin && delta) {
      elements.forEach((element) => {
        const newX = element.position.x - origin.x;
        const newY = element.position.y - origin.y;
        element.scale.x *= delta.x;
        element.scale.y *= delta.y;
        element.position.x = origin.x + newX * delta.x;
        element.position.y = origin.y + newY * delta.y;
      });
    }
  }
}
