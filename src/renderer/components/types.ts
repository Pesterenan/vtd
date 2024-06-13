export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

export type Position = { x: number; y: number }
export type Size = { width: number; height: number }
export type BoundingBox = { x1: number; y1: number; x2: number; y2: number }

/** Status do mouse durante os cliques
 * @param DOWN - Mouse clicado
 * @param MOVE - Mouse arrastando
 * @param UP - Mouse soltou o clique
 * */
export enum MouseStatus {
  DOWN,
  MOVE,
  UP
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
  SCALE
}
