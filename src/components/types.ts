export interface IElementData {
  position: Position;
  rotation: number;
  scale: Scale;
  size: Size;
  zDepth: number;
  isVisible: boolean;
  layerName: string;
}

export interface ITextElementData extends IElementData {
  type: "text";
  content: string;
  font: string;
  fontSize: number;
}

export interface IImageElementData extends IElementData {
  type: "image";
  image: string;
}

export type TElementData = IImageElementData | ITextElementData;

export interface IProjectData {
  elements: TElementData[];
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BoundingBox = { x1: number; y1: number; x2: number; y2: number };
export type Position = { x: number; y: number };
export type Scale = { x: number; y: number };
export type Size = { width: number; height: number };

/** Status do mouse durante os cliques
 * @param DOWN - Mouse clicado
 * @param MOVE - Mouse arrastando
 * @param UP - Mouse soltou o clique
 * */
export enum MouseStatus {
  DOWN,
  MOVE,
  UP,
}

/** Botões do mouse */
export enum MOUSE_BUTTONS {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
  BACK = 3,
  FORWARD = 4,
}

/**
 * Ferramentas para manipular elementos
 * @readonly
 * @enum
 * */
export enum TOOL {
  /** @prop SELECT - Selecionar elemento */
  SELECT,
  /** @prop GRAB - Mover elemento */
  GRAB,
  /** @prop ROTATE - Rotacionar elemento */
  ROTATE,
  /** @prop SCALE - Escalonar elemento */
  SCALE,
  /** @prop HAND - Mover área de trabalho */
  HAND,
  /** @prop ZOOM - Modificar zoom */
  ZOOM,
  /** @prop TEXT - Selecionar e editar texto */
  TEXT,
}
