import { BoundingBox } from "src/utils/boundingBox";
import type {
  EventBus,
  ExportCanvasToStringPayload,
  ExportLayerToClipBoardPayload,
} from "src/utils/eventBus";
import type { Element } from "./elements/element";
import type { TElementData } from "./types";

type Deps = {
  eventBus: EventBus;
  getElements: () => Element<TElementData>[];
  getFlatElements: (els: Element<TElementData>[]) => Element<TElementData>[];
  getCanvas: () => HTMLCanvasElement | null;
  redraw: (transparent?: boolean) => void;
};

export class ClipboardManager {
  constructor(private deps: Deps) {}

  public attach() {
    const eb = this.deps.eventBus;
    eb.on("workarea:canvas:getBlob", this.handleRequestCanvasBlob);
    eb.on("layer:export", this.exportLayerToClipboard);
  }

  public detach() {
    const eb = this.deps.eventBus;
    eb.off("workarea:canvas:getBlob", this.handleRequestCanvasBlob);
    eb.off("layer:export", this.exportLayerToClipboard);
  }

  /**
   * Returns the current canvas as a blob to be exported
   * @param {ExportCanvasToStringPayload} payload -
   * format - format to be exported
   * quality - quality of the image exported
   * transparent - export with a transparent background
   */
  private handleRequestCanvasBlob = ({
    format,
    quality,
    transparent = false,
  }: ExportCanvasToStringPayload): Promise<
    { blob: Blob; dataURL: string } | undefined
  > => {
    return new Promise((resolve) => {
      if (!this.deps.getCanvas()) return resolve(undefined);

      const parsedQuality = (Number.parseInt(quality, 10) || 100) / 100;
      this.deps.redraw(transparent);

      this.deps.getCanvas()?.toBlob(
        (blob) => {
          if (transparent) this.deps.redraw(false);
          if (!blob) return resolve(undefined);
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              blob,
              dataURL: reader.result as string,
            });
          };
          reader.readAsDataURL(blob);
        },
        `image/${format}`,
        parsedQuality,
      );
    });
  };

  private exportLayerToClipboard = ({
    layerId,
    transparent,
  }: ExportLayerToClipBoardPayload): void => {
    const element = this.deps
      .getFlatElements(this.deps.getElements())
      .find((el) => el.elementId === layerId);
    if (!element) {
      this.deps.eventBus.emit("alert:add", {
        message: "Elemento não encontrado",
        type: "error",
      });
      return;
    }

    const tempCanvas = document.createElement("canvas");
    const tempContext = tempCanvas.getContext("2d");
    if (!tempContext) {
      this.deps.eventBus.emit("alert:add", {
        message: "Erro ao criar o contexto do canvas",
        type: "error",
      });
      return;
    }

    const { position, size } = BoundingBox.calculateBoundingBox([element]);
    tempCanvas.width = size.width;
    tempCanvas.height = size.height;
    const sourceCanvas = this.deps.getCanvas();

    if (!transparent && sourceCanvas) {
      tempContext.drawImage(
        sourceCanvas,
        position.x - size.width / 2,
        position.y - size.height / 2,
        size.width,
        size.height,
        0,
        0,
        size.width,
        size.height,
      );
    } else {
      tempContext.translate(
        -position.x + size.width * 0.5,
        -position.y + size.height * 0.5,
      );
      element.draw(tempContext);
    }

    tempCanvas.toBlob((blob) => {
      if (blob) {
        const item = new ClipboardItem({ "image/png": blob });
        navigator.clipboard.write([item]);
        this.deps.eventBus.emit("alert:add", {
          message: "Camada copiada para a área de transferência",
          type: "success",
        });
      } else {
        this.deps.eventBus.emit("alert:add", {
          message: "Erro ao copiar a camada",
          type: "error",
        });
      }
    }, "image/png");
  };
}
