import { remap } from '../../utils/easing';
import { Position } from '../types';
import { WorkArea } from '../workArea';
import { Tool } from './abstractTool';

const MIN_ZOOM_LEVEL = 0.1;
const MAX_ZOOM_LEVEL = 2.0;

export class ZoomTool extends Tool {
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

  handleMouseMove({ offsetX }: MouseEvent): void {
    if (this.previousMousePosition) {
      const deltaX = offsetX - this.previousMousePosition.x;
      const newZoomLevel = remap(
        0,
        this.workArea.mainCanvas.width * 0.7,
        MIN_ZOOM_LEVEL,
        MAX_ZOOM_LEVEL,
        deltaX,
        true
      );
      this.workArea.zoomLevel = newZoomLevel;
      this.workArea.update();
    }
  }

  handleKeyDown(): void {
    if (!this.previousMousePosition) {
      const currentZoomPosition = remap(
        MIN_ZOOM_LEVEL,
        MAX_ZOOM_LEVEL,
        0,
        this.workArea.mainCanvas.width * 0.7,
        this.workArea.zoomLevel,
        true
      );
      this.previousMousePosition = this.workArea.mouse.position;
      this.previousMousePosition.x -= currentZoomPosition;
    }
  }

  handleKeyUp(): void {
    this.previousMousePosition = null;
  }
}
