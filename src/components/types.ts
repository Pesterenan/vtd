import type { FilterProperties } from "../filters/filter";
import type { ICroppingBoxData } from "../utils/croppingBox";

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
export type ElementType = "text" | "image" | "gradient" | "group" | "path";

export interface Point {
  center: Position;
  in: Position | null;
  out: Position | null;
}

export interface IPathElementData extends IElementData {
  type: "path";
  points: Point[];
  isClosed: boolean;
  hasFill: boolean;
  hasStroke: boolean;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  lineCap: "butt" | "round" | "square";
  lineJoin: "miter" | "round" | "bevel";
  lineDash: "solid" | "dashed" | "dotted";
  miterLimit: number;
}

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
  cropping?: ICroppingBoxData;
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
  | IElementGroupData
  | IGradientElementData
  | IImageElementData
  | IPathElementData
  | ITextElementData;

export interface IProjectData {
  createDate: string;
  elements: TElementData[];
  modifyDate: string;
  title: string;
  version: string;
  workAreaSize: Size;
}

export type TBoundingBox = { x1: number; y1: number; x2: number; y2: number };
export type Position = { x: number; y: number };
export type Scale = { x: number; y: number };
export type Size = { width: number; height: number };

/** Ferramentas para manipular elementos @readonly @enum */
export enum TOOL {
  /** @prop MULTI - Selecionar, mover, rotacionar, escalonar elemento */
  MULTI = "multi-tool",
  /** @prop TEXT - Selecionar e editar texto */
  TEXT = "text-tool",
  /** @prop GRADIENT - Criar gradientes */
  GRADIENT = "gradient-tool",
  /** @prop HAND - Mover área de trabalho */
  HAND = "hand-tool",
  /** @prop PEN - Desenhar caminhos */
  PEN = "pen-tool",
  /** @prop ZOOM - Modificar zoom */
  ZOOM = "zoom-tool",
}
