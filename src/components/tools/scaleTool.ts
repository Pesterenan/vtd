import EVENT from "../../utils/customEvents";
import { Element } from "../element";
import { Position, Scale, TElementData } from "../types";
import { Tool } from "./abstractTool";
import centerHandleScale from "../../components/transformBox/assets/centerHandleScale.svg";
import { WorkArea } from "../workArea";
import { TransformBox } from "../transformBox/transformBox";

export class ScaleTool extends Tool {
  private startingPosition: Position | null = null;
  private centerPosition: Position | null = null;
  private toolIcon: HTMLImageElement | null = null;
  private selectedElements: Element<TElementData>[] | null = null;
  private transformBox: TransformBox | null = null;
  private isScaling = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.toolIcon = new Image(12, 12);
    this.toolIcon.src = centerHandleScale;
  }

  equipTool(): void {
    this.selectedElements = WorkArea.getInstance().getSelectedElements();
    this.transformBox = WorkArea.getInstance().transformBox;
    if (this.transformBox) {
      this.centerPosition = this.transformBox.getCenter();
    }
    super.equipTool();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  unequipTool(): void {
    super.unequipTool();
    this.transformBox = null;
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

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(evt: MouseEvent): void {
    if (evt.altKey && this.transformBox) {
      this.centerPosition = WorkArea.getInstance().adjustForZoom({
        x: evt.offsetX - WorkArea.getInstance().offset.x,
        y: evt.offsetY - WorkArea.getInstance().offset.y,
      });
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      return;
    }
    if (!this.isScaling) {
      this.isScaling = true;
      this.startingPosition = { x: evt.offsetX, y: evt.offsetY };
      super.handleMouseDown();
    }
  }

  handleMouseUp(): void {
    this.startingPosition = null;
    this.isScaling = false;
    super.handleMouseUp();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  handleMouseMove(event: MouseEvent): void {
    if (
      this.transformBox &&
      this.selectedElements &&
      this.startingPosition &&
      this.isScaling
    ) {
      const deltaX = event.offsetX - this.startingPosition.x;
      const deltaY = event.offsetY - this.startingPosition.y;
      const delta = { x: 1 + deltaX / 100, y: 1 + deltaY / 100 };
      ScaleTool.scaleSelectedElements(
        this.selectedElements,
        this.centerPosition,
        delta,
      );
      this.startingPosition = {
        x: event.offsetX,
        y: event.offsetY,
      };
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}

  public static scaleSelectedElements(
    elements: Element<TElementData>[] | null,
    origin: Position | null,
    delta: Scale | null,
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
