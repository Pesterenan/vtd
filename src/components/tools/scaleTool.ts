import EVENT from "src/utils/customEvents";
import type { Position } from "src/components/types";
import { Tool } from "src/components/tools/abstractTool";
import centerHandleScale from "src/assets/icons/scale-tool.svg";
import { WorkArea } from "src/components/workArea";
import type { TransformBox } from "src/components/transformBox";
import { toRadians } from "src/utils/transforms";

export class ScaleTool extends Tool {
  private startingPosition: Position | null = null;
  private centerPosition: Position | null = null;
  private toolIcon: HTMLImageElement | null = null;
  private transformBox: TransformBox | null = null;
  private onHover: ((evt: MouseEvent) => void) | null = null;
  private isScaling = false;
  private selectedHandle: number | null = null;
  private hoveredHandle: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.toolIcon = new Image(12, 12);
    this.toolIcon.src = centerHandleScale;
  }

  equipTool(): void {
    this.transformBox = WorkArea.getInstance().transformBox;
    if (this.transformBox && this.transformBox.boundingBox) {
      this.centerPosition = this.transformBox.position;
    }
    super.equipTool();
    this.onHover = (evt: MouseEvent) => {
      if (this.transformBox && this.transformBox.boundingBox) {
        const mousePos = WorkArea.getInstance().adjustForCanvas({
          x: evt.offsetX,
          y: evt.offsetY,
        });
        if (this.transformBox.handles) {
          const handleIndex = Object.keys(this.transformBox.handles).find(
            (handle) => {
              if (this.transformBox?.handles) {
                const point =
                  this.transformBox?.handles[
                    handle as keyof typeof this.transformBox.handles
                  ];
                return (
                  Math.hypot(mousePos.x - point.x, mousePos.y - point.y) < 30
                );
              }
              return false;
            },
          );
          if (handleIndex !== undefined && !this.isScaling) {
            this.hoveredHandle = handleIndex;
          }
        }
        window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
      }
    };
    this.canvas.addEventListener("mousemove", this.onHover);
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  unequipTool(): void {
    super.unequipTool();
    if (this.onHover) {
      this.canvas.removeEventListener("mousemove", this.onHover);
    }
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  draw(): void {
    if (
      this.toolIcon &&
      this.transformBox &&
      this.centerPosition &&
      this.transformBox.handles &&
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
      this.context.translate(this.centerPosition.x, this.centerPosition.y);
      this.context.rotate(toRadians(this.transformBox.rotation));
      this.context.translate(-this.centerPosition.x, -this.centerPosition.y);
      if (this.transformBox.handles) {
        Object.keys(this.transformBox.handles).forEach((handle) => {
          if (this.transformBox?.handles) {
            const point =
              this.transformBox.handles[
                handle as keyof typeof this.transformBox.handles
              ];
            if (this.context) {
              this.context.save();
              this.context.fillStyle =
                this.hoveredHandle == handle ? "green" : "red";
              this.context.beginPath();
              this.context.arc(point.x, point.y, 10, 0, Math.PI * 2);
              this.context.closePath();
              this.context.fill();
              this.context.restore();
            }
          }
        });
      }
      this.context.restore();
    }
  }

  handleMouseDown(evt: MouseEvent): void {
    if (!this.isScaling && this.transformBox) {
      const mousePos = WorkArea.getInstance().adjustForCanvas({
        x: evt.offsetX,
        y: evt.offsetY,
      });
      this.startingPosition = mousePos;

      if (this.transformBox.handles) {
        const handleIndex = Object.keys(this.transformBox.handles).find(
          (handle) => {
            if (this.transformBox?.handles) {
              const point =
                this.transformBox?.handles[
                  handle as keyof typeof this.transformBox.handles
                ];
              return (
                Math.hypot(mousePos.x - point.x, mousePos.y - point.y) < 30
              );
            }
            return false;
          },
        );
        if (handleIndex !== undefined && !this.isScaling) {
          this.selectedHandle = Object.keys(this.transformBox.handles).indexOf(
            handleIndex as keyof typeof this.transformBox.handles,
          );
          this.isScaling = true;
          super.handleMouseDown();
        }
      }
    }
  }

  handleMouseUp(): void {
    this.startingPosition = null;
    this.isScaling = false;
    this.selectedHandle = null;
    super.handleMouseUp();
    window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
  }

  private rotatePoint(
    point: Position,
    center: Position,
    angle: number,
  ): Position {
    const radians = toRadians(angle);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
      x: cos * dx - sin * dy + center.x,
      y: sin * dx + cos * dy + center.y,
    };
  }

  private getDeltaAndAnchor(deltaX: number, deltaY: number) {
    let delta: Position = { x: deltaX, y: deltaY };
    let anchor: Position = this.transformBox?.handles?.CENTER ?? { x: 0, y: 0 };

    if (this.transformBox === null || this.transformBox?.handles === null)
      return { delta, anchor };

    switch (this.selectedHandle) {
      case 0: // Top Left
        delta = { x: -deltaX, y: -deltaY };
        anchor = this.transformBox.handles.BOTTOM_RIGHT;
        break;
      case 2: // Top Right
        delta = { x: deltaX, y: -deltaY };
        anchor = this.transformBox.handles.BOTTOM_LEFT;
        break;
      case 4: // Bottom Right
        delta = { x: deltaX, y: deltaY };
        anchor = this.transformBox.handles.TOP_LEFT;
        break;
      case 6: // Bottom Left
        delta = { x: -deltaX, y: deltaY };
        anchor = this.transformBox.handles.TOP_RIGHT;
        break;
      case 1: // Top Center (apenas altura)
        delta = { x: 0, y: -deltaY };
        anchor = this.transformBox.handles.BOTTOM;
        break;
      case 3: // Right Center (apenas largura)
        delta = { x: deltaX, y: 0 };
        anchor = this.transformBox.handles.LEFT;
        break;
      case 5: // Bottom Center (apenas altura)
        delta = { x: 0, y: deltaY };
        anchor = this.transformBox.handles.TOP;
        break;
      case 7: // Left Center (apenas largura)
        delta = { x: -deltaX, y: 0 };
        anchor = this.transformBox.handles.RIGHT;
        break;
      case 8: // Center
        delta = { x: 0, y: 0 };
        anchor = this.transformBox.handles.CENTER;
        break;
    }
    return { delta, anchor };
  }

  handleMouseMove(evt: MouseEvent): void {
    if (
      this.isScaling &&
      this.transformBox &&
      this.startingPosition &&
      this.selectedHandle !== null
    ) {
    if (this.transformBox === null || this.transformBox?.boundingBox === null)
      return;
      const mousePos = WorkArea.getInstance().adjustForCanvas({
        x: evt.offsetX,
        y: evt.offsetY,
      });

      const rotatedMousePos = this.rotatePoint(
        mousePos,
        this.transformBox.boundingBox.center,
        -this.transformBox.rotation,
      );
      const rotatedStartingPos = this.rotatePoint(
        this.startingPosition,
        this.transformBox.boundingBox.center,
        -this.transformBox.rotation,
      );

      const deltaX = rotatedMousePos.x - rotatedStartingPos.x;
      const deltaY = rotatedMousePos.y - rotatedStartingPos.y;

      const { delta, anchor } = this.getDeltaAndAnchor(deltaX, deltaY);

      const scaleChange = {
        x: 1 + delta.x / this.transformBox.size.width,
        y: 1 + delta.y / this.transformBox.size.height,
      };

      // Atualizar o TransformBox com o novo tamanho baseado no delta
      this.transformBox.updateScale(scaleChange, anchor);

      this.startingPosition = mousePos;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}
}
