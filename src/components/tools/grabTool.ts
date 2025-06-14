import centerHandleMove from "src/assets/icons/move-tool.svg";
import { Tool } from "src/components/tools/abstractTool";
import type { TransformBox } from "src/components/transformBox";
import type { Position } from "src/components/types";
import { WorkArea } from "src/components/workArea";
import EVENT, { dispatch } from "src/utils/customEvents";

export class GrabTool extends Tool {
  private toolIcon: HTMLImageElement | null = null;
  private startPosition: Position | null = null;
  private transformBox: TransformBox | null = null;
  private onHover: ((evt: MouseEvent) => void) | null = null;
  private isDragging = false;
  private isHovering = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.toolIcon = new Image(20, 20);
    this.toolIcon.src = centerHandleMove;
  }

  equipTool(): void {
    super.equipTool();
    this.transformBox = WorkArea.getInstance().transformBox;
    this.onHover = (evt: MouseEvent) => {
      if (this.transformBox?.boundingBox) {
        const mousePos = WorkArea.getInstance().adjustForCanvas({
          x: evt.offsetX,
          y: evt.offsetY,
        });
        this.isHovering = this.transformBox.boundingBox.isPointInside(mousePos);
        dispatch(EVENT.UPDATE_WORKAREA);
      }
    };
    this.canvas.addEventListener("mousemove", this.onHover);
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  unequipTool(): void {
    super.unequipTool();
    if (this.onHover) {
      this.canvas.removeEventListener("mousemove", this.onHover);
    }
    this.resetTool();
  }

  resetTool(): void {
    this.startPosition = null;
    this.isDragging = false;
    this.isHovering = false;
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  draw(): void {
    if (this.toolIcon && this.transformBox && this.context) {
      const centerPosition = this.transformBox.position;
      const workAreaZoom = WorkArea.getInstance().zoomLevel;
      const workAreaOffset = WorkArea.getInstance().offset;
      this.context.save();
      this.context.translate(workAreaOffset.x, workAreaOffset.y);
      this.context.scale(workAreaZoom, workAreaZoom);
      this.toolIcon.width = this.isHovering ? 25 : 20;
      this.toolIcon.height = this.isHovering ? 25 : 20;
      this.context.drawImage(
        this.toolIcon,
        centerPosition.x - (this.toolIcon.width * 0.5) / workAreaZoom,
        centerPosition.y - (this.toolIcon.height * 0.5) / workAreaZoom,
        this.toolIcon.width / workAreaZoom,
        this.toolIcon.height / workAreaZoom,
      );
      this.context.restore();
    }
  }

  handleMouseDown(evt: MouseEvent): void {
    super.handleMouseDown(evt);
    if (this.transformBox?.boundingBox) {
      const mousePos = WorkArea.getInstance().adjustForCanvas({
        x: evt.offsetX,
        y: evt.offsetY,
      });
      this.isDragging = this.transformBox.boundingBox.isPointInside(mousePos);
      this.startPosition = {
        x: mousePos.x - this.transformBox.position.x,
        y: mousePos.y - this.transformBox.position.y,
      };
      dispatch(EVENT.UPDATE_WORKAREA);
    }
  }

  handleMouseUp(evt: MouseEvent): void {
    super.handleMouseUp(evt);
    this.resetTool();
  }

  handleMouseMove(evt: MouseEvent): void {
    if (this.transformBox && this.isDragging && this.startPosition) {
      const mousePos = WorkArea.getInstance().adjustForCanvas({
        x: evt.offsetX,
        y: evt.offsetY,
      });
      const delta = {
        x: mousePos.x - this.startPosition.x,
        y: mousePos.y - this.startPosition.y,
      };
      this.transformBox.updatePosition(delta);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
