import EVENT, { dispatch } from "src/utils/customEvents";
import { WorkArea } from "src/components/workArea";
import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "../types";

const DRAGGING_DISTANCE = 5;

export class SelectTool extends Tool {
  private firstPoint: Position | null = null;
  private secondPoint: Position | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
  }

  equipTool(): void {
    super.equipTool();
  }

  unequipTool(): void {
    super.unequipTool();
  }

  public draw(): void {
    if (this.firstPoint && this.secondPoint && this.context) {
      this.context.save();
      this.context.strokeStyle = "black";
      this.context.setLineDash([3, 3]);
      this.context.lineWidth = 2;
      this.context.strokeRect(
        this.firstPoint.x,
        this.firstPoint.y,
        this.secondPoint.x - this.firstPoint.x,
        this.secondPoint.y - this.firstPoint.y,
      );
      this.context.restore();
    }
  }

  handleMouseDown(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    this.firstPoint = { x: offsetX, y: offsetY };
    super.handleMouseDown(evt);
  }

  handleMouseMove(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    if (this.firstPoint) {
      const distance = Math.hypot(
        offsetX - this.firstPoint.x,
        offsetY - this.firstPoint.y,
      );
      if (distance > DRAGGING_DISTANCE) {
        this.secondPoint = { x: offsetX, y: offsetY };
        dispatch(EVENT.UPDATE_WORKAREA);
      }
    }
  }

  handleMouseUp(evt: MouseEvent): void {
    WorkArea.getInstance().selectElements(this.firstPoint, this.secondPoint);
    this.firstPoint = null;
    this.secondPoint = null;
    super.handleMouseUp(evt);
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
