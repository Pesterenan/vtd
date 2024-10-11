import EVENT from "src/utils/customEvents";
import type { Element } from "src/components/elements/element";
import type { Position, TElementData } from "src/components/types";
import { WorkArea } from "src/components/workArea";
import { Tool } from "src/components/tools/abstractTool";
import centerHandleRotate from "src/assets/icons/rotate-tool.svg";
import type { TransformBox } from "src/components/transformBox";

export class RotateTool extends Tool {
  private startingPosition: Position | null = null;
  private centerPosition: Position | null = null;
  private lastRotation = 0;
  private toolIcon: HTMLImageElement | null = null;
  private transformBox: TransformBox | null = null;
  private selectedElements: Element<TElementData>[] | null = null;
  private isRotating = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.toolIcon = new Image(20, 20);
    this.toolIcon.src = centerHandleRotate;
  }

  equipTool(): void {
    this.transformBox = WorkArea.getInstance().transformBox;
    this.selectedElements = WorkArea.getInstance().getSelectedElements();
    if (this.transformBox) {
      this.centerPosition = this.transformBox.getCenter();
      this.lastRotation = 0;
    }
    super.equipTool();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  unequipTool(): void {
    super.unequipTool();
    this.resetTool();
  }

  resetTool() {
    this.transformBox = null;
    this.startingPosition = null;
    this.centerPosition = null;
    this.isRotating = false;
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  draw(): void {
    if (
      this.toolIcon &&
      this.transformBox &&
      this.centerPosition &&
      this.context
    ) {
      const workAreaZoom = WorkArea.getInstance().zoomLevel;
      const workAreaOffset = WorkArea.getInstance().offset;

      this.context.save();
      this.context.translate(workAreaOffset.x, workAreaOffset.y);
      this.context.scale(workAreaZoom, workAreaZoom);
      this.context.drawImage(
        this.toolIcon,
        this.centerPosition.x - (this.toolIcon.width * 0.5) / workAreaZoom,
        this.centerPosition.y - (this.toolIcon.height * 0.5) / workAreaZoom,
        this.toolIcon.width / workAreaZoom,
        this.toolIcon.height / workAreaZoom,
      );
      this.context.restore();
    }
  }

  handleMouseDown(evt: MouseEvent): void {
    if (evt.altKey && this.transformBox) {
      this.centerPosition = WorkArea.getInstance().adjustForCanvas({
        x: evt.offsetX,
        y: evt.offsetY,
      });
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      return;
    }
    if (!this.isRotating) {
      this.isRotating = true;
      this.startingPosition = { x: evt.offsetX, y: evt.offsetY };
      super.handleMouseDown();
    }
  }

  handleMouseUp(): void {
    this.isRotating = false;
    this.startingPosition = null;
    this.lastRotation = 0;
    super.handleMouseUp();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  handleMouseMove(evt: MouseEvent): void {
    if (
      this.isRotating &&
      this.transformBox &&
      this.selectedElements &&
      this.startingPosition
    ) {
      const deltaX = evt.offsetX - this.startingPosition.x;

      let angle = deltaX % 360;
      if (angle < 0) {
        angle += 360;
      }
      //RotateTool.rotateSelectedElements(
      //  this.selectedElements,
      //  this.centerPosition,
      //  angle - this.lastRotation,
      //);
      this.transformBox.updateRotation(angle, this.centerPosition!);
      this.lastRotation = angle;
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
      const angleInRadians = (angle * Math.PI) / 180;
      elements.forEach((element) => {
        const deltaX = element.position.x - origin.x;
        const deltaY = element.position.y - origin.y;
        const newX =
          deltaX * Math.cos(angleInRadians) - deltaY * Math.sin(angleInRadians);
        const newY =
          deltaX * Math.sin(angleInRadians) + deltaY * Math.cos(angleInRadians);
        element.position = { x: origin.x + newX, y: origin.y + newY };
        element.rotation += angleInRadians;
      });
    }
  }
}
