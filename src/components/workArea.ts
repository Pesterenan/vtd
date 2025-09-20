import type { Element } from "src/components/elements/element";
import { GradientElement } from "src/components/elements/gradientElement";
import { ImageElement } from "src/components/elements/imageElement";
import { TextElement } from "src/components/elements/textElement";
import type { Layer, Position, Size, TElementData } from "src/components/types";
import type {
  EventBus,
  ExportCanvasToStringPayload,
  ExportLayerToClipBoardPayload,
  PositionPayload,
  ReorganizeLayersPayload,
  SelectElementsAtPayload,
  SelectElementsByIdPayload,
  UpdateElementPayload,
} from "src/utils/eventBus";
import { ElementGroup } from "./elements/elementGroup";
import { FilterRenderer } from "src/filters/filterRenderer";
import { BoundingBox } from "src/utils/boundingBox";
import { TransformBox } from "./transformBox";

export class WorkArea {
  public canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  public transformBox: TransformBox | null = null;
  private _elements: Element<TElementData>[] = [];
  public get elements(): Element<TElementData>[] {
    return this._elements;
  }
  private set elements(elements: Element<TElementData>[]) {
    this._elements = elements;
  }
  public constructor(private eventBus: EventBus) {
    this.createDOMElements();
    this.addEvents();
  }

  private createDOMElements(): void {
    const workAreaCanvas = document.createElement("canvas");
    workAreaCanvas.style.backgroundColor = "white";
    const workAreaContext = workAreaCanvas.getContext("2d");
    if (!workAreaContext) {
      throw new Error("Unable to get workAreaCanvas context");
    }
    this.canvas = workAreaCanvas;
    this.context = workAreaContext;
    FilterRenderer.getInstance(this.canvas);
  }

  private addEvents(): void {
    this.eventBus.on("edit:gradient", this.handleEditGradient);
    this.eventBus.on("edit:text", this.handleEditText);
    this.eventBus.on("workarea:addGroupElement", this.handleAddGroupElement);
    this.eventBus.on("workarea:canvas:getBlob", this.handleRequestCanvasBlob);
    this.eventBus.on("workarea:selectAt", this.selectElementsAt);
    this.eventBus.on("workarea:selectById", this.selectElementsById);
    this.eventBus.on("workarea:selected:get", this.getSelectedElements);
    this.eventBus.on("layer:generateHierarchy", this.handleReorganizeLayers);
    this.eventBus.on("workarea:updateElement", this.handleUpdateElement);
    this.eventBus.on("layer:export", this.exportLayerToClipboard);
    this.eventBus.on("workarea:deleteElement", this.handleDeleteElement);
    this.eventBus.on("workarea:getElement:get", this.getElement);
    this.eventBus.on("layer:applyCrop", this.handleApplyCrop);
  }

  public removeEvents(): void {
    this.eventBus.off("edit:gradient", this.handleEditGradient);
    this.eventBus.off("edit:text", this.handleEditText);
    this.eventBus.off("workarea:addGroupElement", this.handleAddGroupElement);
    this.eventBus.off("workarea:canvas:getBlob", this.handleRequestCanvasBlob);
    this.eventBus.off("workarea:selectAt", this.selectElementsAt);
    this.eventBus.off("workarea:selectById", this.selectElementsById);
    this.eventBus.off("workarea:selected:get", this.getSelectedElements);
    this.eventBus.off("layer:generateHierarchy", this.handleReorganizeLayers);
    this.eventBus.off("workarea:updateElement", this.handleUpdateElement);
    this.eventBus.off("layer:export", this.exportLayerToClipboard);
    this.eventBus.off("workarea:deleteElement", this.handleDeleteElement);
    this.eventBus.off("workarea:getElement:get", this.getElement);
    this.eventBus.off("layer:applyCrop", this.handleApplyCrop);
  }

  public setWorkAreaSize(newSize?: Size) {
    if (this.canvas && newSize) {
      this.canvas.width = newSize.width;
      this.canvas.height = newSize.height;
      FilterRenderer.updateSize(newSize);
    }
  }

  public async loadElements(elementsData?: TElementData[]) {
    const elementPromises =
      elementsData?.map((el) => this.createElementFromData(el)) ?? [];
    const loadedElements = await Promise.all(elementPromises);
    this.elements = loadedElements.filter(
      (el): el is Element<TElementData> => el !== null,
    );

    const hierarchy = this.buildLayerHierarchy(this.elements);
    this.eventBus.emit("layer:setHierarchy", { hierarchy });
  }

  private buildLayerHierarchy(elements: Element<TElementData>[]): Layer[] {
    const hierarchy: Layer[] = [];
    for (const element of elements) {
      const layer: Layer = {
        id: element.elementId,
        name: element.layerName,
        isVisible: element.isVisible,
        isLocked: element.isLocked,
      };
      if (element instanceof ElementGroup && element.children) {
        layer.children = this.buildLayerHierarchy(element.children);
      }
      hierarchy.push(layer);
    }
    return hierarchy;
  }

  private handleEditGradient = ({ position }: PositionPayload): void => {
    const elements = this.getSelectedElements();
    if (!elements || !(elements[0] instanceof GradientElement)) {
      this.addGradientElement(position);
      this.selectElementsAt({ firstPoint: position });
    }
  };

  private handleEditText = ({ position }: PositionPayload): void => {
    this.selectElementsAt({ firstPoint: position });
    const elements = this.getSelectedElements();
    if (!elements || !(elements[0] instanceof TextElement)) {
      this.addTextElement(position);
      this.selectElementsAt({ firstPoint: position });
    }
  };

  private createTransformBox = (): void => {
    this.removeTransformBox();
    const selectedElements = this.getSelectedElements();
    if (selectedElements.length) {
      this.transformBox = new TransformBox(selectedElements, this.eventBus);
    }
  };

  private removeTransformBox = (): void => {
    this.transformBox?.removeEvents();
    this.transformBox = null;
  };

  private handleDeleteElement = (): void => {
    this.removeTransformBox();
    this.eventBus.emit("workarea:update");
  };

  private handleUpdateElement = ({
    elementId,
    layerName,
    isVisible,
    isLocked,
  }: UpdateElementPayload): void => {
    const elementToUpdate = this.getFlatElements(this.elements).find(
      (el) => el.elementId === elementId,
    );
    if (elementToUpdate) {
      if (layerName !== undefined) {
        elementToUpdate.layerName = layerName;
      }
      if (isVisible !== undefined) {
        elementToUpdate.isVisible = isVisible;
      }
      if (isLocked !== undefined) {
        if (elementToUpdate instanceof ElementGroup) {
          if (elementToUpdate.children) {
            for (const child of elementToUpdate.children) {
              child.selected = false;
            }
          }
        }
        elementToUpdate.isLocked = isLocked;
        this.selectElementsAt({});
      }
    }
    this.eventBus.emit("workarea:update");
  };

  private selectElementsById = ({
    elementsId,
  }: SelectElementsByIdPayload): void => {
    const selectElement = (element: Element<TElementData>) => {
      element.selected = elementsId.has(element.elementId) && !element.isLocked;
    };
    for (const el of this.elements) {
      if (el instanceof ElementGroup) {
        if (el.children && !el.isLocked) {
          el.children.forEach(selectElement);
        }
      } else {
        selectElement(el);
      }
    }
    this.createTransformBox();
    this.eventBus.emit("selection:changed", {
      selectedElements: this.getSelectedElements(),
    });
    this.eventBus.emit("workarea:update");
  };

  private getFlatElements(
    elements: Element<TElementData>[],
  ): Element<TElementData>[] {
    const flatElements: Element<TElementData>[] = [];
    for (const el of elements) {
      flatElements.push(el);
      if (el instanceof ElementGroup && el.children) {
        flatElements.push(...this.getFlatElements(el.children));
      }
    }
    return flatElements;
  }

  private processLayerHierarchy(
    hierarchy: Layer[],
    flatElements: Element<TElementData>[],
    counter: { value: number },
  ): Element<TElementData>[] {
    const orderedElements: Element<TElementData>[] = [];
    for (const layer of hierarchy) {
      const element = flatElements.find((el) => el.elementId === layer.id);
      if (element) {
        element.zDepth = counter.value++;
        element.selected = false;
        orderedElements.push(element);
        if (layer.children && element instanceof ElementGroup) {
          const childElements = this.processLayerHierarchy(
            layer.children,
            flatElements,
            counter,
          );
          (element as ElementGroup).children = childElements;
        }
      }
    }
    return orderedElements;
  }

  private handleReorganizeLayers = ({
    hierarchy,
  }: ReorganizeLayersPayload): void => {
    const flatElements = this.getFlatElements(this.elements);
    const counter = { value: 0 };
    const newOrderedElements = this.processLayerHierarchy(
      hierarchy,
      flatElements,
      counter,
    );
    this.elements = newOrderedElements;
    this.elements.sort((a, b) => a.zDepth - b.zDepth);
    this.selectElementsAt({});
    this.eventBus.emit("workarea:update");
  };

  public async createElementFromData(
    elData: TElementData,
  ): Promise<Element<TElementData> | null> {
    let newElement: Element<TElementData> | null = null;

    switch (elData.type) {
      case "image":
        newElement = new ImageElement(
          elData.position,
          elData.size,
          elData.zDepth,
        ) as Element<TElementData>;
        break;
      case "text":
        newElement = new TextElement(
          elData.position,
          elData.size,
          elData.zDepth,
        ) as Element<TElementData>;
        break;
      case "gradient":
        newElement = new GradientElement(
          elData.position,
          elData.size,
          elData.zDepth,
        ) as Element<TElementData>;
        break;
      case "group": {
        const children = await Promise.all(
          elData.children.map((el) => this.createElementFromData(el)),
        );
        newElement = new ElementGroup(
          elData.position,
          elData.size,
          elData.zDepth,
          children.filter((el): el is Element<TElementData> => el !== null),
        ) as Element<TElementData>;
        break;
      }
    }

    if (newElement) {
      await Promise.resolve(newElement.deserialize(elData));
    }

    return newElement;
  }

  private handleRequestCanvasBlob = ({
    format,
    quality,
  }: ExportCanvasToStringPayload): Promise<
    { blob: Blob; dataURL: string } | undefined
  > => {
    return new Promise((resolve) => {
      if (!this.canvas) {
        console.error("Canvas not found");
        return resolve(undefined);
      }

      const parsedQuality = (Number.parseInt(quality, 10) || 100) / 100;
      this.canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                blob,
                dataURL: reader.result as string,
              });
            };
            reader.readAsDataURL(blob);
          } else {
            resolve(undefined);
          }
        },
        `image/${format}`,
        parsedQuality,
      );
    });
  };

  private getSelectedElements = (): Element<TElementData>[] => {
    const selectedElements: Element<TElementData>[] = [];
    for (const el of this.elements) {
      if (el instanceof ElementGroup) {
        if (el.children?.length) {
          for (const child of el.children) {
            if (child.selected) {
              selectedElements.push(child);
            }
          }
        }
      } else {
        if (el.selected) {
          selectedElements.push(el);
        }
      }
    }
    return selectedElements;
  };

  public selectElementsAt = ({
    firstPoint,
    secondPoint,
  }: SelectElementsAtPayload): void => {
    let selectedElements: Element<TElementData>[] = [];
    if (firstPoint) {
      const [adjustedFirstPoint] = this.eventBus.request(
        "workarea:adjustForCanvas",
        { position: firstPoint },
      );
      const firstElement = this.elements.findLast((el) => {
        if (el instanceof ElementGroup) {
          return (
            el.isVisible &&
            !el.isLocked &&
            el.getBoundingBox().isPointInside(adjustedFirstPoint)
          );
        }
        return (
          el.isVisible &&
          !el.isLocked &&
          el.getBoundingBox().isPointInside(adjustedFirstPoint)
        );
      });
      if (
        firstElement &&
        firstElement instanceof ElementGroup &&
        firstElement.children
      ) {
        selectedElements = firstElement.children;
      } else if (firstElement) {
        selectedElements = [firstElement as Element<TElementData>];
      }
      if (secondPoint) {
        const [adjustedSecondPoint] = this.eventBus.request(
          "workarea:adjustForCanvas",
          { position: secondPoint },
        );
        for (const el of this.elements) {
          if (el instanceof ElementGroup) {
            if (
              el.children?.some(
                (child) =>
                  child.isVisible &&
                  !child.isLocked &&
                  child
                    .getBoundingBox()
                    .isWithinBounds(adjustedFirstPoint, adjustedSecondPoint),
              )
            ) {
              selectedElements = [...selectedElements, ...el.children];
            }
          } else {
            if (
              el.isVisible &&
              !el.isLocked &&
              el
                .getBoundingBox()
                .isWithinBounds(adjustedFirstPoint, adjustedSecondPoint)
            ) {
              selectedElements.push(el);
            }
          }
        }
      }
    }
    this.eventBus.emit("workarea:selectById", {
      elementsId: new Set(selectedElements.map((el) => el.elementId)),
    });
  };

  public draw(): void {
    if (!this.context || !this.canvas) {
      throw new Error("Canvas context is not available");
    }
    this.clearCanvas();

    // FIX: AJUSTAR COMO A IMAGEM É EXPORTADA SE FOR PNG.
    this.context.fillStyle = "white";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // FIX:

    for (const element of this.elements) {
      element.draw(this.context);
    }
  }

  private clearCanvas(): void {
    if (this.canvas && this.context) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public addGradientElement(position?: Position): void {
    if (!this.canvas) return;
    const width = this.canvas.width;
    const height = this.canvas.height;
    let adjustedPosition = null;
    if (position) {
      adjustedPosition = this.eventBus.request("workarea:adjustForCanvas", {
        position,
      })[0];
    } else {
      adjustedPosition = {
        x: Math.floor(0.5 * (this.canvas?.width || 0)) - width,
        y: Math.floor(0.5 * (this.canvas?.height || 0)) - height,
      };
    }
    const newElement = new GradientElement(
      adjustedPosition,
      { width, height },
      this.elements.length,
    );
    this.elements.push(newElement as Element<TElementData>);
    this.eventBus.emit("workarea:addElement", {
      elementId: newElement.elementId,
      isLocked: newElement.isLocked,
      isVisible: newElement.isVisible,
      layerName: newElement.layerName,
      type: "gradient",
    });
    this.eventBus.emit("workarea:update");
  }

  public addTextElement(position?: Position): TextElement {
    const width = 10;
    const height = 10;
    let adjustedPosition = null;
    if (position) {
      adjustedPosition = this.eventBus.request("workarea:adjustForCanvas", {
        position,
      })[0];
    } else {
      adjustedPosition = {
        x: Math.floor(0.5 * (this.canvas?.width || 0)) - width,
        y: Math.floor(0.5 * (this.canvas?.height || 0)) - height,
      };
    }
    const newElement = new TextElement(
      adjustedPosition,
      { width, height },
      this.elements.length,
    );
    this.elements.push(newElement as Element<TElementData>);
    this.eventBus.emit("workarea:addElement", {
      elementId: newElement.elementId,
      isLocked: newElement.isLocked,
      isVisible: newElement.isVisible,
      layerName: newElement.layerName,
      type: "text",
    });
    this.eventBus.emit("workarea:update");

    return newElement;
  }

  public async addImageElement(encodedImage: string): Promise<ImageElement> {
    const x = (this.canvas?.width || 0) * 0.5;
    const y = (this.canvas?.height || 0) * 0.5;
    const newElement = new ImageElement(
      { x, y },
      { width: 0, height: 0 },
      this.elements.length,
    );
    await newElement.loadImage(encodedImage);
    this.elements.push(newElement as Element<TElementData>);
    this.eventBus.emit("workarea:addElement", {
      elementId: newElement.elementId,
      isLocked: newElement.isLocked,
      isVisible: newElement.isVisible,
      layerName: newElement.layerName,
      type: "image",
    });
    this.eventBus.emit("workarea:update");

    return newElement;
  }

  public handleAddGroupElement = (): void => {
    const newElement = new ElementGroup(
      { x: 0, y: 0 },
      { width: 0, height: 0 },
      this.elements.length,
      [],
    );
    this.elements.push(newElement as Element<TElementData>);
    this.eventBus.emit("workarea:addElement", {
      children: [],
      elementId: newElement.elementId,
      isLocked: newElement.isLocked,
      isVisible: newElement.isVisible,
      layerName: newElement.layerName,
      type: "group",
    });
    this.eventBus.emit("workarea:update");
  };

  private getElement = ({
    elementId,
  }: {
    elementId: number;
  }): Element<TElementData> | undefined => {
    return this.getFlatElements(this.elements).find(
      (el) => el.elementId === elementId,
    );
  };

  private handleApplyCrop = async ({
    layerId,
    keepOriginal,
    smoothingEnabled,
  }: {
    layerId: number;
    keepOriginal: boolean;
    smoothingEnabled: boolean;
  }): Promise<void> => {
    const originalElement = this.getElement({ elementId: layerId });

    if (originalElement && originalElement instanceof ImageElement) {
      const newImageData =
        originalElement.getCroppedImageDataUrl(smoothingEnabled);
      if (newImageData) {
        const newElement = await this.addImageElement(newImageData);
        newElement.position = {
          x: this.canvas ? this.canvas.width * 0.5 : originalElement.position.x,
          y: this.canvas
            ? this.canvas.height * 0.5
            : originalElement.position.y,
        };
        newElement.rotation = originalElement.rotation;
        newElement.scale = { ...originalElement.scale };

        if (!keepOriginal) {
          this.eventBus.emit("workarea:deleteElement", { elementId: layerId });
        }
      }
    }
  };

  private exportLayerToClipboard = ({
    layerId,
    transparent,
  }: ExportLayerToClipBoardPayload): void => {
    const element = this.getFlatElements(this.elements).find(
      (el) => el.elementId === layerId,
    );
    if (!element) {
      this.eventBus.emit("alert:add", {
        message: "Elemento não encontrado",
        type: "error",
      });
      return;
    }

    const tempCanvas = document.createElement("canvas");
    const tempContext = tempCanvas.getContext("2d");
    if (!tempContext) {
      this.eventBus.emit("alert:add", {
        message: "Erro ao criar o contexto do canvas",
        type: "error",
      });
      return;
    }

    const { position, size } = BoundingBox.calculateBoundingBox([element]);
    tempCanvas.width = size.width;
    tempCanvas.height = size.height;

    if (!transparent && this.canvas) {
      tempContext.drawImage(
        this.canvas,
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
        this.eventBus.emit("alert:add", {
          message: "Camada copiada para a área de transferência",
          type: "success",
        });
      } else {
        this.eventBus.emit("alert:add", {
          message: "Erro ao copiar a camada",
          type: "error",
        });
      }
    }, "image/png");
  };
}
