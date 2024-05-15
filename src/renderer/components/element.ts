export class Element {
  private position: { x: number; y: number }
  private size: { width: number; height: number }
  private zDepth: number

  private constructor(x: number, y: number, w: number, h: number, z: number) {
    this.position = { x, y }
    this.size = { width: w, height: h }
    this.zDepth = z
  }

  public draw(context) {
    console.log('element draw at', this.zDepth, context)
  }
}
