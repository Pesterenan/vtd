import { BB } from '../utils/bb'
import { BoundingBox, Position, Scale, Size } from './types'

export class Element {
  public position: Position
  public size: Size
  public scale: Scale = { x: 1.0, y: 1.0 }
  public zDepth: number
  public color: string
  public rotation: number = 0
  private corners: {
    upperLeft: Position
    upperRight: Position
    lowerRight: Position
    lowerLeft: Position
  }
  private image: HTMLImageElement | null = null
  private isImageLoaded: boolean = false

  public constructor(position: Position, size: Size, z: number) {
    this.position = position
    this.size = size
    this.zDepth = z
    const randomR = Math.floor(Math.random() * 99).toFixed(0)
    const randomG = Math.floor(Math.random() * 99).toFixed(0)
    const randomB = Math.floor(Math.random() * 99).toFixed(0)
    this.color = `#${randomR.padEnd(2, 'F')}${randomG.padEnd(2, 'F')}${randomB.padEnd(2, 'F')}`
    const halfWidth = this.size.width * 0.5 * this.scale.x
    const halfHeight = this.size.height * 0.5 * this.scale.y
    this.corners = {
      upperLeft: { x: -halfWidth, y: -halfHeight },
      upperRight: { x: halfWidth, y: -halfHeight },
      lowerLeft: { x: halfWidth, y: halfHeight },
      lowerRight: { x: -halfWidth, y: halfHeight }
    }
  }

  public draw(context: CanvasRenderingContext2D): void {
    context.save()
    // Move the origin to the center of the element
    context.translate(this.position.x, this.position.y)
    // Rotate around the new origin
    context.rotate(this.rotation)

    if (this.isImageLoaded && this.image) {
      context.drawImage(
        this.image,
        (-this.size.width / 2) * this.scale.x,
        (-this.size.height / 2) * this.scale.y,
        this.size.width * this.scale.x,
        this.size.height * this.scale.y
      )
    } else {
      // Draw the rectangle centered at the origin
      context.fillStyle = this.color
      context.fillRect(
        -this.size.width / 2,
        -this.size.height / 2,
        this.size.width,
        this.size.height
      )

      // Draw the zDepth text
      context.fillStyle = 'white'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(String(this.zDepth), 0, 0)
    }

    context.restore()
  }

  public loadImage(filePath: string, onLoadCallback: () => void): void {
    this.image = new Image()
    this.image.src = filePath
    this.image.onload = (): void => {
      this.isImageLoaded = true
      this.size = { width: this.image!.width, height: this.image!.height }
      const halfWidth = (this.size.width / 2) * this.scale.x
      const halfHeight = (this.size.height / 2) * this.scale.y
      this.corners = {
        upperLeft: { x: -halfWidth, y: -halfHeight },
        upperRight: { x: halfWidth, y: -halfHeight },
        lowerLeft: { x: halfWidth, y: halfHeight },
        lowerRight: { x: -halfWidth, y: halfHeight }
      }
      onLoadCallback()
    }
  }

  public getTransformedBoundingBox(): BoundingBox {
    const transformedCorners = Object.values(this.corners).map(({ x, y }) => {
      const transformedX =
        this.position.x + x * Math.cos(this.rotation) - y * Math.sin(this.rotation)
      const transformedY =
        this.position.y + x * Math.sin(this.rotation) + y * Math.cos(this.rotation)
      return { x: transformedX, y: transformedY }
    })

    const xCoordinates = transformedCorners.map((corner) => corner.x)
    const yCoordinates = transformedCorners.map((corner) => corner.y)

    return {
      x1: Math.min(...xCoordinates),
      y1: Math.min(...yCoordinates),
      x2: Math.max(...xCoordinates),
      y2: Math.max(...yCoordinates)
    }
  }

  public isBelowSelection(selection: BoundingBox | null): boolean {
    if (!selection) return false
    const elementBoundingBox: BoundingBox = this.getTransformedBoundingBox()
    return new BB(selection).isBBWithin(elementBoundingBox)
  }

  public isWithinBounds(selection: BoundingBox | null): boolean {
    if (!selection) return false
    const elementBoundingBox: BoundingBox = this.getTransformedBoundingBox()
    return new BB(elementBoundingBox).isBBWithin(selection)
  }
}
