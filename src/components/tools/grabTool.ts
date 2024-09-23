import EVENT from "../../utils/customEvents";
import { Element } from "../element";
import {
  BoundingBox,
  MOUSE_BUTTONS,
  MouseStatus,
  Position,
  TOOL,
} from "../types";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";
import centerHandleMove from "../../components/transformBox/assets/centerHandleMove.svg";
import { BB } from "../../utils/bb";

export class GrabTool extends Tool {
  private startingPosition: Position | null = null;
  private lastPosition: Position | null = null;
  private toolIcon: HTMLImageElement | null = null;
  private selectedElements: Element[] | null = null;
  private isDraggingCenter: boolean = false;

  constructor(workArea: WorkArea) {
    super(workArea);
    this.toolIcon = new Image(12, 12);
    this.toolIcon.src = centerHandleMove;
  }

  initializeTool(): void {
    if (!this.startingPosition && this.workArea.transformBox) {
      this.startingPosition = this.workArea.mouse.position;
      this.lastPosition = this.startingPosition;
      this.selectedElements = this.workArea.getSelectedElements();
      this.workArea.transformBox.centerHandle = this.toolIcon;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(evt: MouseEvent): void {
    if (this.workArea.transformBox && this.selectedElements) {
      const center = this.workArea.transformBox.getCenter();
      const hoverBB = new BB(center, 20);
      console.log(hoverBB, "hover");
      if (hoverBB.isPointWithinBB(center)) {
        this.isDraggingCenter = true;
        this.lastPosition = { x: evt.offsetX, y: evt.offsetY };
      }
    }
  }

  handleMouseUp(event: MouseEvent): void {
    if (event.button === MOUSE_BUTTONS.LEFT) {
      if (!this.isDraggingCenter) {
        console.log("Accept position");
      }
    }
    if (event.button === MOUSE_BUTTONS.RIGHT) {
      if (this.selectedElements) {
        if (this.startingPosition && this.lastPosition) {
          const delta = {
            x: this.startingPosition.x - this.lastPosition.x,
            y: this.startingPosition.y - this.lastPosition.y,
          };
          const adjustedDelta = WorkArea.getInstance().adjustForZoom(delta);
          GrabTool.moveSelectedElements(this.selectedElements, adjustedDelta);
        }
        console.log("Reset position");
      }
    }
    this.resetTool();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  resetTool() {
    this.startingPosition = null;
    this.lastPosition = null;
    this.isDraggingCenter = false;
    this.workArea.mouse.status = MouseStatus.UP;
    this.workArea.currentTool = TOOL.SELECT;
  }

  handleMouseMove(event: MouseEvent): void {
    if (this.workArea.transformBox && this.isDraggingCenter) {
      if (this.selectedElements && this.lastPosition) {
        const delta = {
          x: event.offsetX - this.lastPosition.x,
          y: event.offsetY - this.lastPosition.y,
        };
        const adjustedDelta = WorkArea.getInstance().adjustForZoom(delta);
        GrabTool.moveSelectedElements(this.selectedElements, adjustedDelta);
        this.lastPosition = { x: event.offsetX, y: event.offsetY };
      }
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
