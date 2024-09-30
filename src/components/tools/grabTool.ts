import EVENT from "../../utils/customEvents";
import { Element } from "../element";
import { Position, TElementData } from "../types";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";
import centerHandleMove from "../../components/transformBox/assets/centerHandleMove.svg";
import { BB } from "../../utils/bb";
import { TransformBox } from "../transformBox/transformBox";

export class GrabTool extends Tool {
  private lastPosition: Position | null = null;
  private toolIcon: HTMLImageElement | null = null;
  private selectedElements: Element<TElementData>[] | null = null;
  private isDraggingCenter = false;
  private transformBox: TransformBox | null = null;
  private onHover: ((evt: MouseEvent) => void) | null = null;
  private isHovering = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.toolIcon = new Image(20, 20);
    this.toolIcon.src = centerHandleMove;
  }

  equipTool(): void {
    this.onHover = (evt: MouseEvent) => {
      if (this.transformBox) {
        const offset = WorkArea.getInstance().offset;
        const mouseDownPosition = WorkArea.getInstance().adjustForZoom({
          x: evt.offsetX - offset.x,
          y: evt.offsetY - offset.y,
        });
        const transformBoxCenter = this.transformBox.getCenter();
        const centerBB = new BB(transformBoxCenter, 40);
        this.isHovering = centerBB.isPointWithinBB(mouseDownPosition);
        window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      }
    };
    this.canvas.addEventListener("mousemove", this.onHover);

    this.selectedElements = WorkArea.getInstance().getSelectedElements();
    this.transformBox = WorkArea.getInstance().transformBox;

    super.equipTool();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  unequipTool(): void {
    super.unequipTool();
    if (this.onHover) {
      this.canvas.removeEventListener("mousemove", this.onHover);
    }
    this.transformBox = null;
    this.resetTool();
  }

  draw(): void {
    if (this.toolIcon && this.transformBox && this.context) {
      const centerPosition = this.transformBox.getCenter();
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

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(evt: MouseEvent): void {
    evt.stopPropagation();
    if (this.transformBox) {
      const offset = WorkArea.getInstance().offset;
      const mouseDownPosition = WorkArea.getInstance().adjustForZoom({
        x: evt.offsetX - offset.x,
        y: evt.offsetY - offset.y,
      });
      const transformBoxCenter = this.transformBox.getCenter();
      const centerBB = new BB(transformBoxCenter, 40);
      if (centerBB.isPointWithinBB(mouseDownPosition)) {
        this.isDraggingCenter = true;
        this.lastPosition = { x: evt.offsetX, y: evt.offsetY };
        super.handleMouseDown();
      }
    }
  }

  handleMouseUp(): void {
    if (this.isDraggingCenter) {
      console.log("Accept position");
      super.handleMouseUp();
      this.resetTool();
    }
  }

  resetTool() {
    this.lastPosition = null;
    this.isDraggingCenter = false;
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  handleMouseMove(evt: MouseEvent): void {
    if (this.isDraggingCenter && this.lastPosition) {
      const delta = {
        x: evt.offsetX - this.lastPosition.x,
        y: evt.offsetY - this.lastPosition.y,
      };
      const adjustedDelta = WorkArea.getInstance().adjustForZoom(delta);
      GrabTool.moveSelectedElements(this.selectedElements, adjustedDelta);
      this.lastPosition = { x: evt.offsetX, y: evt.offsetY };
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}

  public static moveSelectedElements(
    elements: Element<TElementData>[] | null,
    delta: Position,
  ): void {
    if (elements) {
      elements.forEach((element) => {
        element.position = {
          x: element.position.x + delta.x,
          y: element.position.y + delta.y,
        };
      });
    }
  }
}
