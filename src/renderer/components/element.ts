export class Element {
  private position: { x: number; y: number }
  private size: { width: number; height: number }
  private zDepth: number
  private selected: boolean = false
  private color: string

  public constructor(x: number, y: number, w: number, h: number, z: number) {
    this.position = { x, y }
    this.size = { width: w, height: h }
    this.zDepth = z
    const randomR = Math.floor(Math.random() * 99).toFixed(0)
    const randomG = Math.floor(Math.random() * 99).toFixed(0)
    const randomB = Math.floor(Math.random() * 99).toFixed(0)
    this.color = `#${randomR.padEnd(2, 'F')}${randomG.padEnd(2, 'F')}${randomB.padEnd(2, 'F')}`
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.fillStyle = this.color
    context.fillRect(this.position.x, this.position.y, this.size.width, this.size.height)

    if (this.selected) {
      context.strokeStyle = 'red'
      context.lineWidth = 2
      context.strokeRect(this.position.x, this.position.y, this.size.width, this.size.height)
    }

    context.fillStyle = 'white'
    context.fillText(
      String(this.zDepth),
      this.position.x + this.size.width / 2,
      this.position.y + this.size.height / 2
    )
    context.fillStyle = ''
  }

  public isWithinBounds(selection): boolean {
    if (!selection) return false

    const xStart = Math.min(selection.x1, selection.x2)
    const yStart = Math.min(selection.y1, selection.y2)
    const xEnd = Math.max(selection.x1, selection.x2)
    const yEnd = Math.max(selection.y1, selection.y2)
    return (
      this.position.x >= xStart &&
      this.position.x + this.size.width <= xEnd &&
      this.position.y >= yStart &&
      this.position.y + this.size.height <= yEnd
    )
  }

  public setSelected(selected: boolean): void {
    this.selected = selected
  }
}
