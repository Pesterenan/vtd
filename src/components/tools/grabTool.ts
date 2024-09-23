import EVENT from "../../utils/customEvents";
import { Element } from "../element";
import { MOUSE_BUTTONS, MouseStatus, Position, TOOL } from "../types";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";
import centerHandleMove from "../../components/transformBox/assets/centerHandleMove.svg";
import { BB } from "../../utils/bb";
import { TransformBox } from "../transformBox/transformBox";

export class GrabTool extends Tool {
  private startingPosition: Position | null = null;
  private lastPosition: Position | null = null;
  private toolIcon: HTMLImageElement | null = null;
  private selectedElements: Element[] | null = null;
  private isDraggingCenter = false;
  private transformBox: TransformBox | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.context = canvas.getContext("2d");
    this.toolIcon = new Image(12, 12);
    this.toolIcon.src = centerHandleMove;
  }

  equipTool(): void {
    this.selectedElements = WorkArea.getInstance().getSelectedElements();
    this.transformBox = WorkArea.getInstance().transformBox;
    const onMouseDown = (evt: MouseEvent) => {
      this.handleMouseDown(evt);
      const onMouseMove = (evt: MouseEvent) => this.handleMouseMove(evt);
      const onMouseUp = (evt: MouseEvent): void => {
        this.handleMouseUp(evt);
        this.canvas.removeEventListener("mouseup", onMouseUp);
        this.canvas.removeEventListener("mousemove", onMouseMove);
      };

      this.canvas.addEventListener("mousemove", onMouseMove);
      this.canvas.addEventListener("mouseup", onMouseUp);
    };
    this.canvas.addEventListener("mousedown", onMouseDown);
    this.draw();
    //if (!this.startingPosition && this.canvas.transformBox) {
    //  this.startingPosition = this.canvas.mouse.position;
    //  this.lastPosition = this.startingPosition;
    //  this.selectedElements = this.canvas.getSelectedElements();
    //  this.canvas.transformBox.centerHandle = this.toolIcon;
    //  window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    //}
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unequipTool(): void {}

  draw(): void {
    if (!this.context) throw new Error("Couldn't draw grab tool");
    if (this.toolIcon && this.transformBox) {
      const centerPosition = this.transformBox.getCenter();
      const workAreaZoom = WorkArea.getInstance().zoomLevel;
      const workAreaOffset = WorkArea.getInstance().offset;
      this.context.save();
      this.context.translate(workAreaOffset.x, workAreaOffset.y);
      this.context.scale(workAreaZoom, workAreaZoom);
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
      const centerBB = new BB(transformBoxCenter, 20);
      if (centerBB.isPointWithinBB(mouseDownPosition)) {
        this.isDraggingCenter = true;
        this.startingPosition = { x: evt.offsetX, y: evt.offsetY };
        this.lastPosition = { x: evt.offsetX, y: evt.offsetY };
      }
    }
  }

  handleMouseUp(event: MouseEvent): void {
    if (event.button === MOUSE_BUTTONS.LEFT) {
      if (this.isDraggingCenter) {
        console.log("Accept position");
        this.resetTool();
        window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      }
    }
    //if (event.button === MOUSE_BUTTONS.RIGHT) {
    //  if (this.selectedElements) {
    //    if (this.startingPosition && this.lastPosition) {
    //      const delta = {
    //        x: this.startingPosition.x - this.lastPosition.x,
    //        y: this.startingPosition.y - this.lastPosition.y,
    //      };
    //      const adjustedDelta = WorkArea.getInstance().adjustForZoom(delta);
    //      GrabTool.moveSelectedElements(this.selectedElements, adjustedDelta);
    //    }
    //    console.log("Reset position");
    //  }
    //}
  }

  resetTool() {
    this.startingPosition = null;
    this.lastPosition = null;
    this.isDraggingCenter = false;
    //this.canvas.mouse.status = MouseStatus.UP;
    //this.canvas.currentTool = TOOL.SELECT;
  }

  handleMouseMove(event: MouseEvent): void {
    if (this.isDraggingCenter && this.lastPosition) {
      const delta = {
        x: event.offsetX - this.lastPosition.x,
        y: event.offsetY - this.lastPosition.y,
      };
      const adjustedDelta = WorkArea.getInstance().adjustForZoom(delta);
      GrabTool.moveSelectedElements(this.selectedElements, adjustedDelta);
      this.lastPosition = { x: event.offsetX, y: event.offsetY };
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}

  public static moveSelectedElements(
    elements: Element[] | null,
    delta: Position,
  ): void {
    if (elements) {
      elements.forEach((element) => {
        element.position.x += delta.x;
        element.position.y += delta.y;
      });
    }
  }
}
