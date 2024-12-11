import EVENT from "src/utils/customEvents";
import type { Element } from "src/components/elements/element";
import type { Position, TElementData } from "src/components/types";
import { Tool } from "src/components/tools/abstractTool";
import centerHandleScale from "src/assets/icons/scale-tool.svg";
import { WorkArea } from "src/components/workArea";
import type { TransformBox } from "src/components/transformBox";
import type { Size } from "electron";

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
      this.context.rotate((this.transformBox.rotation * Math.PI) / 180);
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
          console.log(
            "down",
            handleIndex,
            this.selectedHandle,
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

      // Desrotacionar o ponto atual do mouse em relação à rotação da TransformBox
      const angleRad = (this.transformBox.rotation * Math.PI) / 180;
      const cos = Math.cos(-angleRad);
      const sin = Math.sin(-angleRad);

      const desrotacionarPonto = (pos: Position) => {
        const translatedX = pos.x - this.transformBox!.position.x;
        const translatedY = pos.y - this.transformBox!.position.y;
        return {
          x:
            translatedX * cos -
            translatedY * sin +
            this.transformBox!.position.x,
          y:
            translatedX * sin +
            translatedY * cos +
            this.transformBox!.position.y,
        };
      };

      const mousePosDesrotacionado = desrotacionarPonto(mousePos);
      const startingPosDesrotacionado = desrotacionarPonto(
        this.startingPosition,
      );

      const deltaX = mousePosDesrotacionado.x - startingPosDesrotacionado.x;
      const deltaY = mousePosDesrotacionado.y - startingPosDesrotacionado.y;
      let delta: Size = { width: deltaX, height: deltaY };

      // Ajustar a escala conforme o handle selecionado
      switch (this.selectedHandle) {
        case 0: // Top Left
          delta = { width: -deltaX, height: -deltaY };
          break;
        case 2: // Top Right
          delta = { width: deltaX, height: -deltaY };
          break;
        case 4: // Bottom Right
          delta = { width: deltaX, height: deltaY };
          break;
        case 6: // Bottom Left
          delta = { width: -deltaX, height: deltaY };
          break;
        case 1: // Top Center (apenas altura)
          delta = { width: 0, height: -deltaY };
          break;
        case 3: // Right Center (apenas largura)
          delta = { width: deltaX, height: 0 };
          break;
        case 5: // Bottom Center (apenas altura)
          delta = { width: 0, height: deltaY };
          break;
        case 7: // Left Center (apenas largura)
          delta = { width: -deltaX, height: 0 };
          break;
        case 8: // Center
          console.log('centro');
          delta = { width: 0, height: 0 };
          break;
      }

      // Atualizar o TransformBox com o novo tamanho baseado no delta
      this.transformBox.updateScale(
        {
          width: this.transformBox.size.width + delta.width,
          height: this.transformBox.size.height + delta.height,
        },
        this.transformBox.handles?.CENTER,
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
    delta: Size,
  ): void {
    if (elements) {
      elements.forEach((element) => {
        const oldWidth = element.size.width;
        const oldHeight = element.size.height;
        const scaleX = element.size.width / oldWidth;
        const scaleY = element.size.height / oldHeight;
        // Ajusta a posição com base no ponto de ancoragem e nos fatores de escala
        element.position.x =
          anchor.x + (element.position.x - anchor.x) * scaleX;
        element.position.y =
          anchor.y + (element.position.y - anchor.y) * scaleY;
        // Atualiza o tamanho do elemento baseado no delta
        element.size.width = oldWidth * delta.width;
        element.size.height = oldHeight * delta.height;
      });
    }
  }
}
