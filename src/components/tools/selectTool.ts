import EVENT from "../../utils/customEvents";
import { BoundingBox } from "../types";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";

const DRAGGING_DISTANCE = 5;

export class SelectTool extends Tool {
  private selection: BoundingBox | null = null;
  private onMouseDown: ((evt: MouseEvent) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.context = canvas.getContext("2d");
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  equipTool(): void {
    this.onMouseDown = (evt: MouseEvent) => {
      console.log("onmousedown select tool");
      this.handleMouseDown(evt);
      const onMouseMove = (evt: MouseEvent) => {
        this.handleMouseMove(evt);
      };
      const onMouseUp = (): void => {
        this.handleMouseUp();
        this.canvas.removeEventListener("mouseup", onMouseUp);
        this.canvas.removeEventListener("mousemove", onMouseMove);
      };

      this.canvas.addEventListener("mousemove", onMouseMove);
      this.canvas.addEventListener("mouseup", onMouseUp);
    };
    this.canvas.addEventListener("mousedown", this.onMouseDown);
  }

  unequipTool(): void {
    if (this.onMouseDown) {
      this.canvas.removeEventListener("mousedown", this.onMouseDown);
    }
  }

  public draw(): void {
    if (!this.context) throw new Error("Couldn't draw select tool");
    if (this.selection) {
      const { x1, y1, x2, y2 } = this.selection;
      this.context.save();
      this.context.strokeStyle = "black";
      this.context.setLineDash([3, 3]);
      this.context.strokeRect(x1, y1, x2 - x1, y2 - y1);
      this.context.restore();
    }
  }

  handleMouseDown(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    this.selection = { x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY };
    console.log("starting selection", this.selection);
  }

  handleMouseMove(evt: MouseEvent): void {
    const { offsetX, offsetY } = evt;
    if (this.selection) {
      const { x1, y1 } = this.selection;
      const distance = Math.hypot(offsetX - x1, offsetY - y1);
      if (distance > DRAGGING_DISTANCE) {
        this.selection.x2 = offsetX;
        this.selection.y2 = offsetY;
        window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      }
    }
  }

  handleMouseUp(): void {
    if (this.selection) {
      WorkArea.getInstance().selectElements(this.selection);
      this.selection = null;
    }
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
