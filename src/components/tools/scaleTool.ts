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
  private hoveredHandle: number | null = null;

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
        const handleIndex = this.transformBox.handles?.findIndex(
          (handle) =>
            Math.hypot(mousePos.x - handle.x, mousePos.y - handle.y) < 30,
        );
        if (handleIndex !== -1 && !this.isScaling) {
          this.hoveredHandle = handleIndex || -1;
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
      this.transformBox.handles.forEach((handle: Position, index: number) => {
        if (this.context) {
          this.context.save();
          this.context.fillStyle =
            this.hoveredHandle == index ? "green" : "red";
          this.context.beginPath();
          this.context.arc(handle.x, handle.y, 10, 0, Math.PI * 2);
          this.context.closePath();
          this.context.fill();
          this.context.restore();
        }
      });
      this.context.restore();
    }
  }

  handleMouseDown(evt: MouseEvent): void {
    //if (evt.altKey && this.transformBox) {
    //  this.anchorPosition = WorkArea.getInstance().adjustForCanvas({
    //    x: evt.offsetX,
    //    y: evt.offsetY,
    //  });
    //  window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    //  return;
    //}
    if (!this.isScaling && this.transformBox) {
      const mousePos = WorkArea.getInstance().adjustForCanvas({
        x: evt.offsetX,
        y: evt.offsetY,
      });
      this.startingPosition = mousePos;
      const handleIndex = this.transformBox?.handles?.findIndex(
        (handle) =>
          Math.hypot(mousePos.x - handle.x, mousePos.y - handle.y) < 30,
      ) || null;
      if (handleIndex !== -1) {
        this.selectedHandle = handleIndex;
        this.isScaling = true;
        super.handleMouseDown();
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
    //if (this.transformBox && this.startingPosition && this.isScaling) {
    //  const mousePos = WorkArea.getInstance().adjustForCanvas({
    //    x: evt.offsetX,
    //    y: evt.offsetY,
    //  });
    //  const deltaX = mousePos.x - this.startingPosition.x;
    //  const deltaY = mousePos.y - this.startingPosition.y;
    //  //const delta = { x: 1 + deltaX / 100, y: 1 + deltaY / 100 };
    //  //ScaleTool.scaleSelectedElements(
    //  //  this.selectedElements,
    //  //  this.centerPosition,
    //  //  delta,
    //  //);
    //  const delta: Size = { width: deltaX, height: deltaY };
    //  if (evt.shiftKey && this.centerPosition) {
    //    this.transformBox.updateScale(delta, this.centerPosition);
    //  }
    //  this.startingPosition = mousePos;
    //  window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    //}
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

    const deltaX = mousePos.x - this.startingPosition.x;
    const deltaY = mousePos.y - this.startingPosition.y;
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
    }

    // Atualizar o TransformBox com o novo tamanho baseado no delta
    this.transformBox.updateScale(
      {
        width: this.transformBox.size.width + delta.width,
        height: this.transformBox.size.height + delta.height,
      },
      this.transformBox.position,
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
        // Atualiza o tamanho do elemento
        element.size.width *= delta.width;
        element.size.height *= delta.height;

        // Calcula os fatores de escala com base no tamanho antigo e novo
        const scaleX = element.size.width / oldWidth;
        const scaleY = element.size.height / oldHeight;

        // Ajusta a posição com base no ponto de ancoragem e nos fatores de escala
        element.position.x =
          anchor.x + (element.position.x - anchor.x) * scaleX;
        element.position.y =
          anchor.y + (element.position.y - anchor.y) * scaleY;
        element.scale = { x: scaleX, y: scaleY };
      });
    }
  }
}
