import EVENT from "../../utils/customEvents";
import { Element } from "../element";
import { MOUSE_BUTTONS, MouseStatus, Position, Scale, TOOL } from "../types";
import { WorkArea } from "../workArea";
import { Tool } from "./abstractTool";
import centerHandleScale from "../../components/transformBox/assets/centerHandleScale.svg";

export class ScaleTool extends Tool {
  draw(): void {
    throw new Error("Method not implemented.");
  }
  private startingPosition: Position | null = null;
  private centerPosition: Position | null = null;
  private lastPosition: Position | null = null;
  private toolIcon: HTMLImageElement | null = null;
  private selectedElements: Element[] | null = null;
  private resetParameters: { position: Position; scale: Scale }[] | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.toolIcon = new Image(12, 12);
    this.toolIcon.src = centerHandleScale;
  }

  initializeTool(): void {
    if (!this.startingPosition && this.canvas.transformBox) {
      this.startingPosition = this.canvas.mouse.position;
      this.centerPosition = this.canvas.transformBox.getCenter();
      this.lastPosition = this.startingPosition;
      this.selectedElements = this.canvas.getSelectedElements();
      if (this.selectedElements) {
        this.resetParameters = this.selectedElements.map((el) => ({
          position: { ...el.position },
          scale: { ...el.scale },
        }));
      }
      this.canvas.transformBox.centerHandle = this.toolIcon;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleMouseDown(): void {}

  handleMouseUp(event: MouseEvent): void {
    if (event.button === MOUSE_BUTTONS.LEFT) {
      console.log("Accept scale");
    }
    if (event.button === MOUSE_BUTTONS.RIGHT) {
      if (this.selectedElements) {
        this.selectedElements.forEach((element, index) => {
          if (this.resetParameters) {
            element.position = this.resetParameters[index].position;
            element.scale = this.resetParameters[index].scale;
          }
        });
        console.log("Reset scale");
      }
    }
    this.startingPosition = null;
    this.lastPosition = null;
    this.canvas.mouse.status = MouseStatus.UP;
    this.canvas.currentTool = TOOL.SELECT;
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  handleMouseMove(event: MouseEvent): void {
    if (this.canvas.transformBox) {
      if (this.selectedElements && this.lastPosition) {
        const deltaX = event.offsetX - this.lastPosition.x;
        const deltaY = event.offsetY - this.lastPosition.y;
        const delta = { x: 1 + deltaX / 100, y: 1 + deltaY / 100 };
        ScaleTool.scaleSelectedElements(
          this.selectedElements,
          this.centerPosition,
          delta,
        );
        this.lastPosition = {
          x: event.offsetX,
          y: event.offsetY,
        };
      }
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}

  public static scaleSelectedElements(
    elements: Element[] | null,
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
