import EVENT from "src/utils/customEvents";
import type { Element } from "src/components/elements/element";
import type { Position, TElementData } from "src/components/types";
import { WorkArea } from "src/components/workArea";
import { Tool } from "src/components/tools/abstractTool";
import centerHandleRotate from "src/assets/icons/rotate-tool.svg";
import type { TransformBox } from "src/components/transformBox";
import { toDegrees, toRadians } from "src/utils/transforms";

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
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  unequipTool(): void {
    super.unequipTool();
    this.resetTool();
  }

  resetTool() {
    this.startPosition = null;
    this.isRotating = false;
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
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
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      return;
    }
    if (!this.isRotating) {
      this.isRotating = true;
      this.startPosition = mousePos;
      super.handleMouseDown();
    }
  }

  handleMouseUp(): void {
    super.handleMouseUp();
    this.resetTool();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
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
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}

  public static rotateSelectedElements(
    elements: Element<TElementData>[] | null,
    origin: Position | null,
    angle: number,
  ): void {
    if (elements && origin) {
      const angleInRadians = toRadians(angle);
      elements.forEach((element) => {
        const deltaX = element.position.x - origin.x;
        const deltaY = element.position.y - origin.y;
        const newX =
          deltaX * Math.cos(angleInRadians) - deltaY * Math.sin(angleInRadians);
        const newY =
          deltaX * Math.sin(angleInRadians) + deltaY * Math.cos(angleInRadians);
        element.position = { x: origin.x + newX, y: origin.y + newY };
        element.rotation += angle;
      });
    }
  }
}
