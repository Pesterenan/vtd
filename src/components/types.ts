import type { FilterProperties } from "../filters/filter";

export interface IElementData {
  elementId?: number;
  type: ElementType;
  position: Position;
  scale: Scale;
  size: Size;
  rotation: number;
  opacity: number;
  zDepth: number;
  isLocked: boolean;
  isVisible: boolean;
  layerName: string;
  filters: FilterProperties[];
}
export type ElementType = "text" | "image" | "gradient" | "group";

export interface ITextElementData extends IElementData {
  type: "text";
  content: string;
  fillColor: string;
  font: string;
  fontSize: number;
  fontStyle: "normal" | "underline" | "strike-through" | "overline";
  fontWeight: "normal" | "bold" | "italic" | "bold italic";
  hasFill: boolean;
  hasStroke: boolean;
  lineHeight: number;
  strokeColor: string;
  strokeWidth: number;
  textAlign: "left" | "center" | "right";
}

export interface IImageElementData extends IElementData {
  type: "image";
  encodedImage: string;
  backgroundColor: string;
  backgroundOpacity: number;
}

export interface IColorStop {
  /** Where the colorstop is located in the gradient, from 0 to 1 */
  portion: number;
  color: string;
  alpha: number;
}

export interface IGradientElementData extends IElementData {
  type: "gradient";
  startPosition: Position;
  endPosition: Position;
  colorStops: IColorStop[];
  gradientFormat: "conic" | "linear" | "radial";
}

export interface IElementGroupData extends IElementData {
  type: "group";
  children: TElementData[];
}

export interface Layer {
  children?: Layer[];
  id: number;
  isLocked: boolean;
  isVisible: boolean;
  name?: string;
}

export type TElementData =
  | IImageElementData
  | ITextElementData
  | IGradientElementData
  | IElementGroupData;

export interface IProjectData {
  createDate: string;
  elements: TElementData[];
  modifyDate: string;
  title: string;
  version: string;
  workAreaSize: Size;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TBoundingBox = { x1: number; y1: number; x2: number; y2: number };
export type Position = { x: number; y: number };
export type Scale = { x: number; y: number };
export type Size = { width: number; height: number };

/** Botões do mouse */
export enum MOUSE_BUTTONS {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
  BACK = 3,
  FORWARD = 4,
}

/** Ferramentas para manipular elementos @readonly @enum */
export enum TOOL {
  /** @prop SELECT - Selecionar elemento */
  SELECT = "select-tool",
  /** @prop GRAB - Mover elemento */
  GRAB = "grab-tool",
  /** @prop ROTATE - Rotacionar elemento */
  ROTATE = "rotate-tool",
  /** @prop SCALE - Escalonar elemento */
  SCALE = "scale-tool",
  /** @prop TEXT - Selecionar e editar texto */
  TEXT = "text-tool",
  /** @prop GRADIENT - Criar gradientes */
  GRADIENT = "gradient-tool",
  /** @prop HAND - Mover área de trabalho */
  HAND = "hand-tool",
  /** @prop ZOOM - Modificar zoom */
  ZOOM = "zoom-tool",
}
