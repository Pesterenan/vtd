import { BB } from "../utils/bb";
import EVENT from "../utils/customEvents";
import { Element } from "./element";
import { BoundingBox, IImageElementData, Position, Size } from "./types";

export class ImageElement extends Element {
  public color: string;
  private corners: {
    upperLeft: Position;
    upperRight: Position;
    lowerRight: Position;
    lowerLeft: Position;
  };
  public image: HTMLImageElement | null = null;
  private isImageLoaded = false;

  constructor(position: Position, size: Size, z: number) {
    super(position, size, z);
    const randomR = Math.floor(Math.random() * 99).toFixed(0);
    const randomG = Math.floor(Math.random() * 99).toFixed(0);
    const randomB = Math.floor(Math.random() * 99).toFixed(0);
    this.color = `#${randomR.padEnd(2, "F")}${randomG.padEnd(2, "F")}${randomB.padEnd(2, "F")}`;
    const halfWidth = this.size.width * 0.5 * this.scale.x;
    const halfHeight = this.size.height * 0.5 * this.scale.y;
    this.corners = {
      upperLeft: { x: -halfWidth, y: -halfHeight },
      upperRight: { x: halfWidth, y: -halfHeight },
      lowerLeft: { x: halfWidth, y: halfHeight },
      lowerRight: { x: -halfWidth, y: halfHeight },
    };
  }

  public deserialize(data: IImageElementData): void {
    super.deserialize(data);
    if (data.image) {
      this.loadImage(data.image);
    }
  }

  public serialize(): IImageElementData {
    const serializedImage = super.serialize() as IImageElementData;
    serializedImage.type = "image";
    serializedImage.image = this.image ? this.image.src : "";
    return serializedImage;
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;
    // Save context before transformations
    context.save();
    // Move the origin to the center of the element
    context.translate(this.position.x, this.position.y);
    // Rotate around the new origin
    context.rotate(this.rotation);
    // Scale accordingly
    context.scale(this.scale.x, this.scale.y);
    // Draw the element's image
    if (this.isImageLoaded && this.image) {
      context.drawImage(
        this.image,
        -this.size.width * 0.5,
        -this.size.height * 0.5,
        this.size.width,
        this.size.height,
      );
    } else {
      // Draw the rectangle centered at the origin
      context.fillStyle = this.color;
      context.fillRect(
        -this.size.width * 0.5,
        -this.size.height * 0.5,
        this.size.width,
        this.size.height,
      );
      // Draw the zDepth text
      context.fillStyle = "lightblue";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = "bold 4rem Arial";
      context.fillText(String(this.zDepth), 0, 0);
    }
    // Restore the context after the transformations
    context.restore();
  }

  public loadImage(filePath: string): void {
    this.image = new Image();
    this.image.src = filePath;
    this.image.onload = (): void => {
      this.isImageLoaded = true;
      this.size = { width: this.image!.width, height: this.image!.height };
      const halfWidth = this.size.width * 0.5;
      const halfHeight = this.size.height * 0.5;
      this.corners = {
        upperLeft: { x: -halfWidth, y: -halfHeight },
        upperRight: { x: halfWidth, y: -halfHeight },
        lowerLeft: { x: halfWidth, y: halfHeight },
        lowerRight: { x: -halfWidth, y: halfHeight },
      };
      window.dispatchEvent(new CustomEvent(EVENT.UPDATE_WORKAREA));
    };
  }

  public getTransformedBoundingBox(): BoundingBox {
    const transformedCorners = Object.values(this.corners).map(({ x, y }) => {
      const transformedX =
        this.position.x +
        x * this.scale.x * Math.cos(this.rotation) -
        y * this.scale.y * Math.sin(this.rotation);
      const transformedY =
        this.position.y +
        x * this.scale.x * Math.sin(this.rotation) +
        y * this.scale.y * Math.cos(this.rotation);
      return { x: transformedX, y: transformedY };
    });

    const xCoordinates = transformedCorners.map((corner) => corner.x);
    const yCoordinates = transformedCorners.map((corner) => corner.y);

    return {
      x1: Math.min(...xCoordinates),
      y1: Math.min(...yCoordinates),
      x2: Math.max(...xCoordinates),
      y2: Math.max(...yCoordinates),
    };
  }

  public isBelowSelection(selection: BoundingBox | null): boolean {
    if (!selection) return false;
    const elementBoundingBox: BoundingBox = this.getTransformedBoundingBox();
    return new BB(selection).isBBWithin(elementBoundingBox);
  }

  public isWithinBounds(selection: BoundingBox | null): boolean {
    if (!selection) return false;
    const elementBoundingBox: BoundingBox = this.getTransformedBoundingBox();
    return new BB(elementBoundingBox).isBBWithin(selection);
  }
}