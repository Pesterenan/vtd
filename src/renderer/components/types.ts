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
