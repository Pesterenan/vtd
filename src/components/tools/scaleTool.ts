import EVENT from "src/utils/customEvents";
import type { Element } from "src/components/elements/element";
import type { Position, Scale, TElementData } from "src/components/types";
import { Tool } from "src/components/tools/abstractTool";
import centerHandleScale from "src/assets/icons/scale-tool.svg";
import { WorkArea } from "src/components/workArea";
import type { TransformBox } from "src/components/transformBox";
import { toRadians } from "src/utils/transforms";

export class ScaleTool extends Tool {
  private startingPosition: Position | null = null;
  private scaleChange: Scale | null = null;
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
      this.scaleChange = this.transformBox.scale;
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
    this.scaleChange = null;
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

  handleMouseMove(evt: MouseEvent): void {
    if (
      this.isScaling &&
      this.transformBox &&
      this.startingPosition &&
      this.selectedHandle !== null
    ) {
      const mousePos = WorkArea.getInstance().adjustForCanvas({
        x: evt.offsetX,
        y: evt.offsetY,
      });

      const rotatePoint = (
        point: Position,
        center: Position,
        angle: number,
      ) => {
        const radians = toRadians(angle);
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const dx = point.x - center.x;
        const dy = point.y - center.y;

        return {
          x: cos * dx - sin * dy + center.x,
          y: sin * dx + cos * dy + center.y,
        };
      };

      const mousePosDesrotacionado = rotatePoint(
        mousePos,
        this.transformBox.boundingBox.center,
        -this.transformBox.rotation,
      );
      const startingPosDesrotacionado = rotatePoint(
        this.startingPosition,
        this.transformBox.boundingBox.center,
        -this.transformBox.rotation,
      );

      const deltaX = mousePosDesrotacionado.x - startingPosDesrotacionado.x;
      const deltaY = mousePosDesrotacionado.y - startingPosDesrotacionado.y;
      let delta: Position = { x: deltaX, y: deltaY };
      let origin: Position = this.transformBox.handles.CENTER;

      // Ajustar a escala conforme o handle selecionado
      switch (this.selectedHandle) {
        case 0: // Top Left
          delta = { x: -deltaX, y: -deltaY };
          origin = this.transformBox.handles.BOTTOM_RIGHT;
          break;
        case 2: // Top Right
          delta = { x: deltaX, y: -deltaY };
          origin = this.transformBox.handles.BOTTOM_LEFT;
          break;
        case 4: // Bottom Right
          delta = { x: deltaX, y: deltaY };
          origin = this.transformBox.handles.TOP_LEFT;
          break;
        case 6: // Bottom Left
          delta = { x: -deltaX, y: deltaY };
          origin = this.transformBox.handles.TOP_RIGHT;
          break;
        case 1: // Top Center (apenas altura)
          delta = { x: 0, y: -deltaY };
          origin = this.transformBox.handles.BOTTOM;
          break;
        case 3: // Right Center (apenas largura)
          delta = { x: deltaX, y: 0 };
          origin = this.transformBox.handles.LEFT;
          break;
        case 5: // Bottom Center (apenas altura)
          delta = { x: 0, y: deltaY };
          origin = this.transformBox.handles.TOP;
          break;
        case 7: // Left Center (apenas largura)
          delta = { x: -deltaX, y: 0 };
          origin = this.transformBox.handles.RIGHT;
          break;
        case 8: // Center
          delta = { x: 0, y: 0 };
          origin = this.transformBox.handles.CENTER;
          break;
      }

      const scaleChange = {
        x: 1 + delta.x / this.transformBox.size.width,
        y: 1 + delta.y / this.transformBox.size.height,
      };

      this.centerPosition = origin;
      this.scaleChange = scaleChange;
      // Atualizar o TransformBox com o novo tamanho baseado no delta
      this.transformBox.updateScale(
        this.scaleChange,
        rotatePoint(origin, this.centerPosition, this.transformBox.rotation),
      );

      this.startingPosition = mousePos;
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyDown(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleKeyUp(): void {}

  public static scaleSelectedElements(
    elements: Element<TElementData>[] | null,
    anchor: Position,
    delta: Scale,
  ): void {
    if (elements) {
      elements.forEach((element) => {
        const oldWidth = element.size.width;
        const oldHeight = element.size.height;
        const newWidth = delta.x !== 1 ? oldWidth * delta.x : oldWidth;
        const newHeight = delta.y !== 1 ? oldHeight * delta.y : oldHeight;
        // Ajusta a posição com base no ponto de ancoragem e nos fatores de escala
        element.position.x =
          anchor.x +
          (element.position.x - anchor.x) * (delta.x !== 1 ? delta.x : 1);
        element.position.y =
          anchor.y +
          (element.position.y - anchor.y) * (delta.y !== 1 ? delta.y : 1);
        // Atualiza o tamanho do elemento baseado no delta
        element.size.width = newWidth;
        element.size.height = newHeight;
      });
    }
  }
}
