import { WorkArea } from '../workArea';

export abstract class Tool {
  protected workArea: WorkArea;

  constructor(workArea: WorkArea) {
    this.workArea = workArea;
  }

  abstract initializeTool(): void;
  abstract handleMouseDown(event: MouseEvent): void;
  abstract handleMouseUp(event: MouseEvent): void;
  abstract handleMouseMove(event: MouseEvent): void;
  abstract handleKeyDown(event: KeyboardEvent): void;
  abstract handleKeyUp(event: KeyboardEvent): void;
}
