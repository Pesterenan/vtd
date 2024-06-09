import { BB } from '../utils/bb'
import { BoundingBox, Position, Size } from './types'

export class Element {
  public position: Position
  public size: Size
  public zDepth: number
  private color: string
  private rotation: number

  public constructor({ x, y }: Position, { width, height }: Size, z: number) {
    this.position = { x, y }
    this.size = { width, height }
    this.zDepth = z
    this.rotation = 0
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

    const elementBoundingBox: BoundingBox = {
      x1: this.position.x,
      y1: this.position.y,
      x2: this.position.x + this.size.width,
      y2: this.position.y + this.size.height
    }

    return new BB(selection).isBBWithin(elementBoundingBox)
  }

  public isWithinBounds(selection: BoundingBox | null): boolean {
    if (!selection) return false

    const elementBoundingBox: BoundingBox = {
      x1: this.position.x,
      y1: this.position.y,
      x2: this.position.x + this.size.width,
      y2: this.position.y + this.size.height
    }

    return new BB(elementBoundingBox).isBBWithin(selection)
  }
}
