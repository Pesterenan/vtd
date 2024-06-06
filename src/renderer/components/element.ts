import { BoundingBox, Position, Size } from './types'

export class Element {
  public position: Position
  public size: Size
  private zDepth: number
  private color: string
  private rotation: number

  public constructor({ x, y }: Position, { width, height }: Size, z: number) {
    this.position = { x, y }
    this.size = { width, height }
    this.zDepth = z
    this.rotation = Math.PI / 3
    const randomR = Math.floor(Math.random() * 99).toFixed(0)
    const randomG = Math.floor(Math.random() * 99).toFixed(0)
    const randomB = Math.floor(Math.random() * 99).toFixed(0)
    this.color = `#${randomR.padEnd(2, 'F')}${randomG.padEnd(2, 'F')}${randomB.padEnd(2, 'F')}`
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.save()
    // Move the origin to the center of the element
    context.translate(this.position.x + this.size.width / 2, this.position.y + this.size.height / 2)
    // Rotate around the new origin
    context.rotate(this.rotation)
    // Draw the rectangle centered at the origin
    context.fillStyle = this.color
    context.fillRect(-this.size.width / 2, -this.size.height / 2, this.size.width, this.size.height)

    // Draw the zDepth text
    context.fillStyle = 'white'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(String(this.zDepth), 0, 0)

    context.restore()
    context.fillStyle = ''
  }

  public isBelowSelection(selection: BoundingBox | null): boolean {
    if (!selection) return false

    const xStart = Math.min(selection.x1, selection.x2)
    const yStart = Math.min(selection.y1, selection.y2)
    const xEnd = Math.max(selection.x1, selection.x2)
    const yEnd = Math.max(selection.y1, selection.y2)
    const bool =
      xStart >= this.position.x &&
      xEnd <= this.position.x + this.size.width &&
      yStart >= this.position.y &&
      yEnd <= this.position.y + this.size.height
    console.log(selection, this.position)
    console.log(bool, 'selected')
    return bool
  }

  public isWithinBounds(selection: BoundingBox | null): boolean {
    if (!selection) return false

    const xStart = Math.min(selection.x1, selection.x2)
    const yStart = Math.min(selection.y1, selection.y2)
    const xEnd = Math.max(selection.x1, selection.x2)
    const yEnd = Math.max(selection.y1, selection.y2)
    const bool =
      this.position.x >= xStart &&
      this.position.x + this.size.width <= xEnd &&
      this.position.y >= yStart &&
      this.position.y + this.size.height <= yEnd
    console.log(selection, this.position)
    console.log(bool, 'isWithinBounds')
    return bool
  }
}
