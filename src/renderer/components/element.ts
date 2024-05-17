export class Element {
  private position: { x: number; y: number }
  private size: { width: number; height: number }
  private zDepth: number
  private color: string

  private constructor(x: number, y: number, w: number, h: number, z: number) {
    this.position = { x, y }
    this.size = { width: w, height: h }
    this.zDepth = z
    const randomR = Math.floor(Math.random() * 99)
    const randomG = Math.floor(Math.random() * 99)
    const randomB = Math.floor(Math.random() * 99)
    this.color = `#${randomR}${randomG}${randomB}`
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.fillStyle = this.color
    context.fillRect(this.position.x, this.position.y, this.size.width, this.size.height)
    console.log('element draw at', this.zDepth, context)
  }
}
