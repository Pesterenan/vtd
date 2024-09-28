import { BB } from "../utils/bb";
import EVENT from "../utils/customEvents";
import { Element } from "./element";
import { BoundingBox, IImageElementData, Position, Size } from "./types";

export class ImageElement extends Element {
  public get backgroundColor(): string {
    return this.properties.get("backgroundColor") as string;
  }
  public set backgroundColor(value: string) {
    this.properties.set("backgroundColor", value);
  }
  public get backgroundOpacity(): number {
    return this.properties.get("backgroundOpacity") as number;
  }
  public set backgroundOpacity(value: number) {
    const limited = Math.max(0, Math.min(value, 1));
    this.properties.set("backgroundOpacity", limited);
  }

  private corners: {
    upperLeft: Position;
    upperRight: Position;
    lowerRight: Position;
    lowerLeft: Position;
  };
  public image: HTMLImageElement | null = null;
  private isImageLoaded = false;
  protected declare properties: Map<
    keyof IImageElementData,
    IImageElementData[keyof IImageElementData]
  >;

  constructor(position: Position, size: Size, z: number) {
    super(position, size, z);
    this.properties.set("type", "image");
    this.properties.set("encodedImage", "");
    this.backgroundColor = "#00FF00";
    this.backgroundOpacity = 0;

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
    if (data.encodedImage) {
      this.loadImage(data.encodedImage);
    }
  }

  public serialize(): IImageElementData {
    const serializedImage = super.serialize() as IImageElementData;
    if (this.isImageLoaded) {
      serializedImage.encodedImage = this.properties.get(
        "encodedImage",
      ) as string;
    }
    return serializedImage;
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;
    context.save();
    context.translate(this.position.x, this.position.y);
    context.rotate(this.rotation);
    context.scale(this.scale.x, this.scale.y);
    if (this.backgroundOpacity > 0) {
      context.globalAlpha = this.backgroundOpacity;
      context.fillStyle = this.backgroundColor;
      context.fillRect(
        -this.size.width * 0.5,
        -this.size.height * 0.5,
        this.size.width,
        this.size.height,
      );
    }
    if (this.isImageLoaded && this.image) {
      context.globalAlpha = 1;
      context.drawImage(
        this.image,
        -this.size.width * 0.5,
        -this.size.height * 0.5,
        this.size.width,
        this.size.height,
      );
    }
    context.restore();
  }

  public loadImage(encodedImage: string): void {
    this.properties.set("encodedImage", encodedImage);
    this.image = new Image();
    this.image.src = encodedImage;
    this.image.onload = (): void => {
      if (this.image) {
        this.isImageLoaded = true;
        this.size = { width: this.image.width, height: this.image.height };
        const halfWidth = this.size.width * 0.5;
        const halfHeight = this.size.height * 0.5;
        this.corners = {
          upperLeft: { x: -halfWidth, y: -halfHeight },
          upperRight: { x: halfWidth, y: -halfHeight },
          lowerLeft: { x: halfWidth, y: halfHeight },
          lowerRight: { x: -halfWidth, y: halfHeight },
        };
      }
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
