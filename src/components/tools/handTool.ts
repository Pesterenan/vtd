import EVENT from '../../utils/customEvents';
import { Position } from '../types';
import { WorkArea } from '../workArea';
import { Tool } from './abstractTool';

export class HandTool extends Tool {
  private previousMousePosition: Position | null = null;

  constructor(workArea: WorkArea) {
    super(workArea);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  initializeTool(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseUp(): void {}

  handleMouseMove(event: MouseEvent): void {
    if (this.previousMousePosition) {
      const { offsetX, offsetY } = event;
      const deltaX = offsetX - this.previousMousePosition.x;
      const deltaY = offsetY - this.previousMousePosition.y;
      this.workArea.offset.x += deltaX;
      this.workArea.offset.y += deltaY;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      this.previousMousePosition = { x: offsetX, y: offsetY };
    }
  }

  handleKeyDown(): void {
    if (!this.previousMousePosition) {
      this.previousMousePosition = this.workArea.mouse.position;
    }
  }

  handleKeyUp(): void {
    this.previousMousePosition = null;
  }
}
