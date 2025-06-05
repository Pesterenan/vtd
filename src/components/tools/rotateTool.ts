import centerHandleRotate from "src/assets/icons/rotate-tool.svg";
import { Tool } from "src/components/tools/abstractTool";
import type { TransformBox } from "src/components/transformBox";
import type { Position } from "src/components/types";
import { WorkArea } from "src/components/workArea";
import EVENT, { dispatch } from "src/utils/customEvents";
import { toDegrees } from "src/utils/transforms";

export class RotateTool extends Tool {
  private toolIcon: HTMLImageElement | null = null;
  private startPosition: Position | null = null;
  private transformBox: TransformBox | null = null;
  private isRotating = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.toolIcon = new Image(20, 20);
    this.toolIcon.src = centerHandleRotate;
  }

  equipTool(): void {
    super.equipTool();
    this.transformBox = WorkArea.getInstance().transformBox;
    if (this.transformBox) {
      this.transformBox.anchorPoint = this.transformBox.position;
    }
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  unequipTool(): void {
    super.unequipTool();
    this.resetTool();
  }

  resetTool() {
    this.startPosition = null;
    this.isRotating = false;
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  draw(): void {
    if (
      this.toolIcon &&
      this.transformBox &&
      this.transformBox.anchorPoint &&
      this.context
    ) {
      const workAreaZoom = WorkArea.getInstance().zoomLevel;
      const workAreaOffset = WorkArea.getInstance().offset;

      this.context.save();
      this.context.translate(workAreaOffset.x, workAreaOffset.y);
      this.context.scale(workAreaZoom, workAreaZoom);
      this.context.drawImage(
        this.toolIcon,
        this.transformBox.anchorPoint.x -
          (this.toolIcon.width * 0.5) / workAreaZoom,
        this.transformBox.anchorPoint.y -
          (this.toolIcon.height * 0.5) / workAreaZoom,
        this.toolIcon.width / workAreaZoom,
        this.toolIcon.height / workAreaZoom,
      );
      this.context.restore();
    }
  }

  handleMouseDown(evt: MouseEvent): void {
    const mousePos = WorkArea.getInstance().adjustForCanvas({
      x: evt.offsetX,
      y: evt.offsetY,
    });
    if (evt.altKey && this.transformBox) {
      this.transformBox.anchorPoint = mousePos;
      this.resetTool();
      return;
    }
    if (!this.isRotating) {
      this.isRotating = true;
      this.startPosition = mousePos;
      super.handleMouseDown(evt);
    }
  }

  handleMouseUp(evt: MouseEvent): void {
    super.handleMouseUp(evt);
    this.resetTool();
    dispatch(EVENT.UPDATE_WORKAREA);
  }

  handleMouseMove(evt: MouseEvent): void {
    if (
      this.isRotating &&
      this.transformBox &&
      this.transformBox.anchorPoint &&
      this.startPosition
    ) {
      const mousePos = WorkArea.getInstance().adjustForCanvas({
        x: evt.offsetX,
        y: evt.offsetY,
      });
      const startingAngle = Math.atan2(
        this.startPosition.y - this.transformBox.anchorPoint.y,
        this.startPosition.x - this.transformBox.anchorPoint.x,
      );
      const currentAngle = Math.atan2(
        mousePos.y - this.transformBox.anchorPoint.y,
        mousePos.x - this.transformBox.anchorPoint.x,
      );
      const angle = toDegrees(currentAngle - startingAngle);
      const normalizedAngle = (this.transformBox.rotation + angle) % 360;
      this.transformBox.updateRotation(
        normalizedAngle,
        this.transformBox.anchorPoint,
      );
      this.startPosition = mousePos;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
