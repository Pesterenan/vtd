import type { Element } from "src/components/elements/element";
import type { Tool } from "src/components/tools/abstractTool";
import type { ToolEventHandler } from "src/components/tools/toolManager";
import type {
  ElementType,
  IProjectData,
  Layer,
  Position,
  Scale,
  Size,
  TElementData,
  TOOL,
} from "src/components/types";

export type Callback<P = unknown, R = unknown> = (payload: P) => R;

export type AddAlertPayload = {
  message: string;
  title?: string;
  type: "success" | "error";
};

export type AddElementPayload = {
  elementId: number;
  layerName: Layer["name"];
  isVisible: boolean;
  isLocked: boolean;
  type: ElementType;
  children?: Array<Layer>;
};

export type UpdateElementPayload = {
  elementId: number;
  layerName?: Layer["name"];
  isVisible?: boolean;
  isLocked?: boolean;
};

export type SelectElementsByIdPayload = {
  elementsId: Set<number>;
};

export type DeleteElementPayload = {
  elementId: number;
};

export type ReorganizeLayersPayload = {
  hierarchy: Layer[];
};

export type ExportLayerToClipBoardPayload = {
  layerId: number;
  transparent: boolean;
};

export type SelectionChangedPayload = {
  selectedElements: Element<TElementData>[];
};

export type ExportCanvasToStringPayload = {
  format: string;
  quality: string;
};

export type DeltaPayload = {
    delta: number;
};

export type UpdateScalePayload = {
  delta: Scale;
  anchor?: Position;
}

export type PositionPayload = {
    position: Position;
};

export type SelectElementsAtPayload = {
    firstPoint?: Position | null;
    secondPoint?: Position | null;
};

export interface EventBusMap {
  "alert:add": {
    payload: AddAlertPayload;
    result: unknown;
  };
  "dialog:elementFilters:open": {
    payload: { layerId: number };
    result: unknown;
  };
  "dialog:exportImage:open": {
    payload: unknown;
    result: unknown;
  };
  "dialog:newProject:open": {
    payload: unknown;
    result: unknown;
  };
  "edit:gradient": {
    payload: PositionPayload;
    result: unknown;
  };
  "edit:gradientUpdateColorStops": {
    payload: unknown;
    result: unknown;
  };
  "edit:text": {
    payload: PositionPayload;
    result: unknown;
  };
  "edit:acceptTextChange": {
    payload: unknown;
    result: unknown;
  };
  "edit:declineTextChange": {
    payload: unknown;
    result: unknown;
  };
  "layer:export": {
    payload: ExportLayerToClipBoardPayload;
    result: unknown;
  };
  "layer:generateHierarchy": {
    payload: ReorganizeLayersPayload;
    result: unknown;
  };
  "tool:change": {
    payload: TOOL;
    result: unknown;
  };
  "tool:event": {
    payload: {
      tool: Tool;
      type: ToolEventHandler;
      event: MouseEvent | KeyboardEvent;
    };
    result: unknown;
  };
  "tool:equipped": {
    payload: Tool;
    result: unknown;
  };
  "tool:unequipped": {
    payload: Tool;
    result: unknown;
  };
  "transformBox:hoverHandle": {
    payload: PositionPayload;
    result: unknown;
  };
  "transformBox:selectHandle": {
    payload: unknown;
    result: boolean;
  };
  "transformBox:getSignAndAnchor": {
    payload: unknown;
    result: {
      anchor: Position;
      xSign: number;
      ySign: number;
    };
  };
  "transformBox:anchorPoint:change": {
    payload: PositionPayload;
    result: unknown;
  };
  "transformBox:anchorPoint:get": {
    payload: unknown;
    result: Position;
  };
  "transformBox:properties:change": {
    payload: {
      position: Position;
      size: Size;
      rotation: number;
      opacity: number;
    };
    result: unknown;
  };
  "transformBox:properties:get": {
    payload: unknown;
    result: {
      position: Position;
      size: Size;
      rotation: number;
      opacity: number;
    };
  };
  "transformBox:position": {
    payload: unknown;
    result: Position;
  };
  "transformBox:rotation": {
    payload: unknown;
    result: number;
  };
  "transformBox:updateOpacity": {
    payload: DeltaPayload;
    result: unknown;
  };
  "transformBox:updatePosition": {
    payload: PositionPayload;
    result: unknown;
  };
  "transformBox:updateRotation": {
    payload: DeltaPayload;
    result: unknown;
  };
  "transformBox:updateScale": {
    payload: { delta: Scale; anchor?: Position };
    result: unknown;
  };
  "vfe:update": {
    payload: unknown;
    result: unknown;
  };
  "workarea:addElement": {
    payload: {
      children?: Layer[];
      elementId: number;
      isLocked: boolean;
      isVisible: boolean;
      layerName: string;
      type: ElementType;
    };
    result: unknown;
  };
  "workarea:addGroupElement": {
    payload: unknown;
    result: unknown;
  };
  "workarea:adjustForCanvas": {
    payload: PositionPayload;
    result: Position;
  };
  "workarea:adjustForScreen": {
    payload: PositionPayload;
    result: Position;
  };
  "workarea:clear": {
    payload: unknown;
    result: unknown;
  };
  "workarea:createNewProject": {
    payload: { projectData: IProjectData };
    result: unknown;
  };
  "workarea:deleteElement": {
    payload: { elementId: number };
    result: unknown;
  };
  "workarea:exportCanvas": {
    payload: ExportCanvasToStringPayload;
    result: string;
  };
  "workarea:offset:change": {
    payload: PositionPayload;
    result: unknown;
  };
  "workarea:offset:get": {
    payload: unknown;
    result: Position;
  };
  "workarea:project:save": {
    payload: unknown;
    result: Partial<IProjectData>;
  };
  "workarea:selectAt": {
    payload: SelectElementsAtPayload;
    result: unknown;
  };
  "workarea:selectById": {
    payload: SelectElementsByIdPayload;
    result: unknown;
  };
  "workarea:selected:get": {
    payload: unknown;
    result: Element<TElementData>[];
  };
  "selection:changed": {
    payload: SelectionChangedPayload;
    result: unknown;
  };
  "workarea:update": {
    payload: unknown;
    result: unknown;
  };
  "workarea:updateElement": {
    payload: {
      elementId: number;
      isLocked?: boolean;
      isVisible?: boolean;
      layerName?: string;
    };
    result: unknown;
  };
  "zoomLevel:change": {
    payload: { level: number; center: Position };
    result: unknown;
  };
  "zoomLevel:get": {
    payload: unknown;
    result: number;
  };
}

export class EventBus {
  private listeners = new Map<keyof EventBusMap, Set<Callback>>();

  public on<K extends keyof EventBusMap>(
    event: K,
    cb: Callback<EventBusMap[K]["payload"], EventBusMap[K]["result"]>,
  ) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)?.add(cb as Callback);
  }

  public off<K extends keyof EventBusMap>(
    event: K,
    cb: Callback<EventBusMap[K]["payload"], EventBusMap[K]["result"]>,
  ) {
    this.listeners.get(event)?.delete(cb as Callback);
  }

  public emit<K extends keyof EventBusMap>(
    event: K,
    payload?: EventBusMap[K]["payload"],
  ) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const cb of eventListeners) {
        cb(payload);
      }
    }
  }

  public request<K extends keyof EventBusMap>(
    event: K,
    payload?: EventBusMap[K]["payload"],
  ): EventBusMap[K]["result"][] {
    const out: EventBusMap[K]["result"][] = [];

    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const cb of eventListeners) {
        out.push(cb(payload));
      }
    }
    return out;
  }
}
