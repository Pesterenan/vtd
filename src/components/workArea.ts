import type { Element } from "src/components/elements/element";
import { GradientElement } from "src/components/elements/gradientElement";
import { ImageElement } from "src/components/elements/imageElement";
import { PathElement } from "./elements/pathElement";
import { TextElement } from "src/components/elements/textElement";
import type {
  ElementType,
  Layer,
  Position,
  Size,
  TElementData,
} from "src/components/types";
import type {
  ElementIdPayload,
  EventBus,
  PositionPayload,
  ReorganizeLayersPayload,
  UpdateElementPayload,
} from "src/utils/eventBus";
import { ElementGroup } from "./elements/elementGroup";
import { FilterRenderer } from "src/filters/filterRenderer";
import { TransformBox } from "./transformBox";
import { SelectionManager } from "./workArea.selection";
import { ClipboardManager } from "./workArea.clipboard";
import { TransformsManager } from "./workArea.transforms";

type RegistrableElement = Pick<
  Element,
  "elementId" | "isLocked" | "isVisible" | "layerName"
>;

export class WorkArea {
  public canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  public transformBox: TransformBox | null = null;
  private _elements: Element[] = [];
  public get elements(): Element[] {
    return this._elements;
  }
  private set elements(elements: Element[]) {
    this._elements = elements;
  }
  private selection: SelectionManager;
  private clipboard: ClipboardManager;
  private transforms: TransformsManager;

  public constructor(private eventBus: EventBus) {
    this.createDOMElements();
    this.selection = new SelectionManager({
      eventBus,
      getElements: this.getElements,
      getFlatElements: (els) => this.getFlatElements(els),
      onSelectionApplied: () => this.createTransformBox(),
    });
    this.clipboard = new ClipboardManager({
      eventBus,
      getElements: this.getElements,
      getFlatElements: (els) => this.getFlatElements(els),
      getCanvas: () => this.canvas,
      redraw: (transparent) => this.draw(transparent),
    });
    this.transforms = new TransformsManager({
      eventBus,
      getElements: this.getElements,
      getFlatElements: (els) => this.getFlatElements(els),
      getCanvas: () => this.canvas,
      setWorkAreaSize: (size) => this.setWorkAreaSize(size),
      refreshTransformBox: () => {
        const selections = this.selection.getSelectedElements();
        if (selections.length) this.createTransformBox();
      },
    });
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
    this.selection.attach();
    this.clipboard.attach();
    this.transforms.attach();
    this.eventBus.on("edit:gradient", this.handleEditGradient);
    this.eventBus.on("edit:path", this.handleEditPath);
    this.eventBus.on("edit:text", this.handleEditText);
    this.eventBus.on("workarea:addGroupElement", this.handleAddGroupElement);
    this.eventBus.on("layer:generateHierarchy", this.handleReorganizeLayers);
    this.eventBus.on("workarea:updateElement", this.handleUpdateElement);
    this.eventBus.on("workarea:deleteElement", this.handleDeleteElement);
    this.eventBus.on("workarea:getElement:get", this.getElement);
    this.eventBus.on("layer:applyCrop", this.handleApplyCrop);
    this.eventBus.on("workarea:updateProperties", this.handleUpdateProperties);
    this.eventBus.on("workarea:elements:get", this.getElements);
  }

  public removeEvents(): void {
    this.selection.detach();
    this.clipboard.detach();
    this.transforms.detach();
    this.eventBus.off("edit:gradient", this.handleEditGradient);
    this.eventBus.off("edit:path", this.handleEditPath);
    this.eventBus.off("edit:text", this.handleEditText);
    this.eventBus.off("workarea:addGroupElement", this.handleAddGroupElement);
    this.eventBus.off("layer:generateHierarchy", this.handleReorganizeLayers);
    this.eventBus.off("workarea:updateElement", this.handleUpdateElement);
    this.eventBus.off("workarea:deleteElement", this.handleDeleteElement);
    this.eventBus.off("workarea:getElement:get", this.getElement);
    this.eventBus.off("layer:applyCrop", this.handleApplyCrop);
    this.eventBus.off("workarea:updateProperties", this.handleUpdateProperties);
    this.eventBus.off("workarea:elements:get", this.getElements);
  }

  public destroy(): void {
    this.removeEvents();
    this.removeTransformBox();
    this.canvas = null;
    this.context = null;
    this.elements = [];
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
      (el): el is Element => el !== null,
    );

    const hierarchy = this.buildLayerHierarchy(this.elements);
    this.eventBus.emit("layer:setHierarchy", { hierarchy });
  }

  private buildLayerHierarchy(elements: Element[]): Layer[] {
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
    const elements = this.selection.getSelectedElements();
    if (!elements || !(elements[0] instanceof GradientElement)) {
      this.addGradientElement(position);
      this.selection.selectElementsAt({ firstPoint: position });
    }
  };

  private handleEditText = ({ position }: PositionPayload): void => {
    this.selection.selectElementsAt({ firstPoint: position });
    const elements = this.selection.getSelectedElements();
    if (!elements || !(elements[0] instanceof TextElement)) {
      this.addTextElement(position);
      this.selection.selectElementsAt({ firstPoint: position });
    }
  };

  public addPathElement = (position: Position): void => {
    if (!this.canvas) return;
    const width = 10;
    const height = 10;
    const newElement = new PathElement(
      position,
      { width, height },
      this.elements.length,
    );
    this.registerElement(newElement, 'path');
  };

  private handleEditPath = ({ position }: PositionPayload): void => {
    this.selection.selectElementsAt({ firstPoint: position });
    const elements = this.selection.getSelectedElements();
    if (!elements || !(elements[0] instanceof PathElement)) {
      this.addPathElement(position);
      this.selection.selectElementsAt({ firstPoint: position });
    }
  };

  private createTransformBox = (): void => {
    this.removeTransformBox();
    const selectedElements = this.selection.getSelectedElements();
    if (selectedElements.length) {
      this.transformBox = new TransformBox(selectedElements, this.eventBus);
    }
  };

  private removeTransformBox = (): void => {
    this.transformBox?.removeEvents();
    this.transformBox = null;
  };

  private handleDeleteElement = ({ elementId }: ElementIdPayload): void => {
    const removeFromList = (list: Element[]): boolean => {
      const index = list.findIndex((el) => el.elementId === elementId);
      if (index !== -1) {
        list.splice(index, 1);
        return true;
      }
      for (const el of list) {
        if (el instanceof ElementGroup && el.children) {
          if (removeFromList(el.children)) return true;
        }
      }
      return false;
    };
    removeFromList(this._elements);
    this.createTransformBox();
    this.eventBus.emit("selection:changed", {
      selectedElements: this.selection.getSelectedElements(),
    });
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
        elementToUpdate.isLocked = isLocked;
        if (isLocked) {
          if (
            elementToUpdate instanceof ElementGroup &&
            elementToUpdate.children
          ) {
            for (const child of elementToUpdate.children) {
              child.selected = false;
            }
          }
          this.selection.clearSelection();
        }
      }
    }
    this.eventBus.emit("layer:setHierarchy", {
      hierarchy: this.buildLayerHierarchy(this.elements),
    });
    this.eventBus.emit("workarea:update");
  };

  private handleUpdateProperties = ({ size }: { size: Size }) => {
    this.setWorkAreaSize(size);
    this.eventBus.emit("mainWindow:resize");
  };

  private getFlatElements(
    elements: Element[],
  ): Element[] {
    const flatElements: Element[] = [];
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
    flatElements: Element[],
    counter: { value: number },
  ): Element[] {
    const orderedElements: Element[] = [];
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
          element.children = childElements;
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
    this.selection.clearSelection();
  };

  public async createElementFromData(
    elData: TElementData,
  ): Promise<Element | null> {
    let newElement: Element | null = null;

    switch (elData.type) {
      case "image":
        newElement = new ImageElement(
          elData.position,
          elData.size,
          elData.zDepth,
        );
        break;
      case "path":
        newElement = new PathElement(
          elData.position,
          elData.size,
          elData.zDepth,
        );
        break;
      case "text":
        newElement = new TextElement(
          elData.position,
          elData.size,
          elData.zDepth,
        );
        break;
      case "gradient":
        newElement = new GradientElement(
          elData.position,
          elData.size,
          elData.zDepth,
        );
        break;
      case "group": {
        const children = await Promise.all(
          elData.children.map((el) => this.createElementFromData(el)),
        );
        newElement = new ElementGroup(
          elData.position,
          elData.size,
          elData.zDepth,
          children.filter((el): el is Element => el !== null),
        );
        break;
      }
    }

    if (newElement) {
      await Promise.resolve(newElement.deserialize(elData));
    }

    return newElement;
  }

  public draw(transparent = false): void {
    if (!this.context || !this.canvas) {
      throw new Error("Canvas context is not available");
    }
    this.clearCanvas();

    if (!transparent) {
      this.context.fillStyle = "white";
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    for (const element of this.elements) {
      element.draw(this.context);
    }
  }

  private clearCanvas(): void {
    if (this.canvas && this.context) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public addGradientElement(position: Position): void {
    if (!this.canvas) return;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const newElement = new GradientElement(
      position,
      { width, height },
      this.elements.length,
    );
    this.registerElement(newElement, 'gradient');
  }

  public addTextElement(position: Position): TextElement {
    const width = 10;
    const height = 10;
    const newElement = new TextElement(
      position,
      { width, height },
      this.elements.length,
    );
    this.registerElement(newElement, 'text');
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
    this.registerElement(newElement, 'image');
    return newElement;
  }

  public handleAddGroupElement = (): void => {
    const newElement = new ElementGroup(
      { x: 0, y: 0 },
      { width: 0, height: 0 },
      this.elements.length,
      [],
    );
    this.registerElement(newElement, 'group', { children: [] });
  };

  private getElement = ({
    elementId,
  }: ElementIdPayload): Element | undefined => {
    return this.getFlatElements(this.elements).find(
      (el) => el.elementId === elementId,
    );
  };

  private getElements = (): Element[] => {
    return this.elements;
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

  private registerElement = (
    el: RegistrableElement,
    type: ElementType,
    extra?: { children: Layer[] },
  ) => {
    this.elements.push(el as Element);
    this.eventBus.emit("workarea:addElement", {
      children: extra?.children,
      elementId: el.elementId,
      isLocked: el.isLocked,
      isVisible: el.isVisible,
      layerName: el.layerName,
      type,
    });
    this.eventBus.emit("workarea:update");
  };
}
