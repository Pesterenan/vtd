import type { EventBus } from "src/utils/eventBus";
import type { Element } from "./elements/element";
import type { Size } from "./types";
import { GradientElement } from "./elements/gradientElement";

type Deps = {
  eventBus: EventBus;
  getElements: () => Element[];
  getFlatElements: (els: Element[]) => Element[];
  getCanvas: () => HTMLCanvasElement | null;
  setWorkAreaSize: (size: Size) => void;
  refreshTransformBox: () => void;
};

export class TransformsManager {
  constructor(private deps: Deps) {}

  public attach() {
    const eb = this.deps.eventBus;
    eb.on("workarea:rotate-anti-clockwise", this.onRotateAntiClockwise);
    eb.on("workarea:rotate-clockwise", this.onRotateClockwise);
    eb.on("workarea:flip-horizontal", this.onFlipHorizontal);
    eb.on("workarea:flip-vertical", this.onFlipVertical);
  }

  public detach() {
    const eb = this.deps.eventBus;
    eb.off("workarea:rotate-anti-clockwise", this.onRotateAntiClockwise);
    eb.off("workarea:rotate-clockwise", this.onRotateClockwise);
    eb.off("workarea:flip-horizontal", this.onFlipHorizontal);
    eb.off("workarea:flip-vertical", this.onFlipVertical);
  }

  private onRotateAntiClockwise = () => this.handleRotateCanvas("anti-clockwise");
  private onRotateClockwise = () => this.handleRotateCanvas("clockwise");
  private onFlipHorizontal = () => this.handleFlipCanvas("horizontal");
  private onFlipVertical = () => this.handleFlipCanvas("vertical");

  private handleRotateCanvas = (
    direction: "clockwise" | "anti-clockwise" = "clockwise",
  ): void => {
    const canvas = this.deps.getCanvas();
    if (!canvas) return;
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    this.deps.setWorkAreaSize({ width: oldHeight, height: oldWidth });

    for (const element of this.deps.getFlatElements(this.deps.getElements())) {
      const { x, y } = element.position;
      let newX, newY, newRotation;
      if (direction === "anti-clockwise") {
        newX = y;
        newY = oldWidth - x;
        newRotation = element.rotation - 90;
      } else {
        newX = oldHeight - y;
        newY = x;
        newRotation = element.rotation + 90;
      }

      let newStart = null;
      let newEnd = null;

      if (element instanceof GradientElement) {
        const { x: sx, y: sy } = element.startPosition;
        const { x: ex, y: ey } = element.endPosition;
        if (direction === "anti-clockwise") {
          newStart = { x: sy, y: oldWidth - sx };
          newEnd = { x: ey, y: oldWidth - ex };
        } else {
          newStart = { x: oldHeight - sy, y: sx };
          newEnd = { x: oldHeight - ey, y: ex };
        }
        element.size = {
          width: element.size.height,
          height: element.size.width,
        };
      }

      element.position = { x: newX, y: newY };
      element.rotation = newRotation % 360;

      if (element instanceof GradientElement && newStart && newEnd) {
        element.startPosition = newStart;
        element.endPosition = newEnd;
      }
    }
    this.deps.refreshTransformBox();
    this.deps.eventBus.emit("mainWindow:resize");
  };

  private handleFlipCanvas = (
    direction: "horizontal" | "vertical" = "horizontal",
  ): void => {
    const canvas = this.deps.getCanvas();
    if (!canvas) return;
    const height = canvas.height;
    const width = canvas.width;

    for (const element of this.deps.getFlatElements(this.deps.getElements())) {
      let newStart = null;
      let newEnd = null;

      if (element instanceof GradientElement) {
        const { x: sx, y: sy } = element.startPosition;
        const { x: ex, y: ey } = element.endPosition;
        if (direction === "vertical") {
          newStart = { x: sx, y: height - sy };
          newEnd = { x: ex, y: height - ey };
        } else {
          newStart = { x: width - sx, y: sy };
          newEnd = { x: width - ex, y: ey };
        }
      }

      if (direction === "vertical") {
        element.position = {
          x: element.position.x,
          y: height - element.position.y,
        };
        element.scale = {
          x: element.scale.x,
          y: element.scale.y * -1,
        };
      } else {
        element.position = {
          x: width - element.position.x,
          y: element.position.y,
        };
        element.scale = {
          x: element.scale.x * -1,
          y: element.scale.y,
        };
      }
      element.rotation = -element.rotation;

      if (element instanceof GradientElement && newStart && newEnd) {
        element.startPosition = newStart;
        element.endPosition = newEnd;
      }
    }
    this.deps.refreshTransformBox();
    this.deps.eventBus.emit("workarea:update");
    this.deps.eventBus.emit("mainWindow:resize");
  };
}
