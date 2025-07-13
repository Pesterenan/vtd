import centerHandleScale from "src/assets/icons/scale-tool.svg";
import { Tool } from "src/components/tools/abstractTool";
import type { Position } from "src/components/types";
import type { EventBus } from "src/utils/eventBus";
import { rotatePoint } from "src/utils/transforms";

export class ScaleTool extends Tool {
  private startPosition: Position | null = null;
  private toolIcon: HTMLImageElement | null = null;
  private isScaling = false;
  private isProportional = false;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    super(canvas, eventBus);
    this.toolIcon = new Image(12, 12);
    this.toolIcon.src = centerHandleScale;
  }

  public equip(): void {
    super.equip();
  }

  public unequip(): void {
    super.unequip();
  }

  public resetTool() {
    this.startPosition = null;
    this.isScaling = false;
    this.isProportional = false;
  }

  public draw(): void {
    const [anchor] = this.eventBus.request("transformBox:anchorPoint:get");
    if (this.toolIcon && this.context && anchor) {
      const [zoomLevel] = this.eventBus.request("zoomLevel:get");
      const [workAreaOffset] = this.eventBus.request("workarea:offset:get");

      this.context.save();
      this.context.translate(workAreaOffset.x, workAreaOffset.y);
      this.context.scale(zoomLevel, zoomLevel);
      this.context.drawImage(
        this.toolIcon,
        anchor.x - (this.toolIcon.width * 0.5) / zoomLevel,
        anchor.y - (this.toolIcon.height * 0.5) / zoomLevel,
        this.toolIcon.width / zoomLevel,
        this.toolIcon.height / zoomLevel,
      );
      this.context.restore();
    }
  }

  public onMouseDown({ altKey, offsetX, offsetY, shiftKey }: MouseEvent): void {
    const [mousePos] = this.eventBus.request("workarea:adjustForCanvas", {
      position: {
        x: offsetX,
        y: offsetY,
      },
    });
    if (altKey) {
      this.eventBus.emit("transformBox:anchorPoint:change", {
        position: mousePos,
      });
      this.eventBus.emit("workarea:update");
      return;
    }
    const [hasHandle] = this.eventBus.request("transformBox:selectHandle");
    if (!this.isScaling && hasHandle) {
      if (shiftKey) {
        this.isProportional = true;
      }
      this.isScaling = true;
      this.startPosition = mousePos;
      this.eventBus.emit("workarea:update");
    }
  }

  public onMouseUp(): void {
    this.resetTool();
  }

  public onMouseMove({ offsetX, offsetY }: MouseEvent): void {
    const [mousePos] = this.eventBus.request("workarea:adjustForCanvas", {
      position: {
        x: offsetX,
        y: offsetY,
      },
    });
    this.eventBus.emit("transformBox:hoverHandle", { position: mousePos });

    const [props] = this.eventBus.request("transformBox:properties:get");
    const [{ xSign, ySign, anchor }] = this.eventBus.request(
      "transformBox:getSignAndAnchor",
    );
    if (!this.isScaling || !this.startPosition || !anchor) {
      this.eventBus.emit("workarea:update");
      return;
    }
    const rotMouse = rotatePoint(mousePos, { x: 0, y: 0 }, -props.rotation);
    const rotStart = rotatePoint(
      this.startPosition,
      { x: 0, y: 0 },
      -props.rotation,
    );

    const rawRatio = {
      x: ((rotMouse.x - rotStart.x) * xSign) / props.size.width,
      y: ((rotMouse.y - rotStart.y) * ySign) / props.size.height,
    };
    let delta = { x: 1 + rawRatio.x, y: 1 + rawRatio.y };

    if (this.isProportional) {
      let scaleFactor: number;
      if (xSign !== 0 && ySign !== 0) {
        scaleFactor = 1 + (rawRatio.x + rawRatio.y) / 2;
      } else if (xSign !== 0) {
        scaleFactor = 1 + rawRatio.x;
      } else if (ySign !== 0) {
        scaleFactor = 1 + rawRatio.y;
      } else {
        scaleFactor = 1;
      }
      delta = { x: scaleFactor, y: scaleFactor };
    }
    this.eventBus.emit("transformBox:updateScale", { delta, anchor });
    this.startPosition = mousePos;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyDown(evt: KeyboardEvent): void {
    if (evt.altKey) {
      evt.preventDefault();
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onKeyUp(): void {}
}
