import { Element } from "src/components/elements/element";
import type { IImageElementData, Position, Size } from "src/components/types";
import { FilterRenderer } from "src/filters/filterRenderer";
import { BoundingBox } from "src/utils/boundingBox";
import { clamp } from "src/utils/easing";
import { toRadians } from "src/utils/transforms";

export class ImageElement extends Element<IImageElementData> {
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
    this.properties.set("backgroundOpacity", clamp(value, 0, 1));
  }

  private boundingBox: BoundingBox;
  public image: HTMLImageElement | null = null;
  private isImageLoaded = false;

  constructor(position: Position, size: Size, z: number) {
    super(position, size, z);
    this.properties.set("type", "image");
    this.properties.set("encodedImage", "");
    this.backgroundColor = "#00FF00";
    this.backgroundOpacity = 0;
    this.boundingBox = new BoundingBox(position, size, this.rotation);
  }

  public deserialize(data: IImageElementData): void {
    super.deserialize(data);
    if (data.encodedImage) {
      this.loadImage(data.encodedImage);
    }
  }

  public serialize(): IImageElementData {
    const serialized = super.serialize();
    if (this.isImageLoaded) {
      serialized.encodedImage = this.properties.get("encodedImage") as string;
    }
    return serialized;
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible || !this.isImageLoaded || !this.image) return;

    // TODO: Implement background draw
    // if (this.backgroundOpacity > 0) {
    //   context.globalAlpha = this.backgroundOpacity;
    //   context.fillStyle = this.backgroundColor;
    //   context.fillRect(
    //     -this.size.width * 0.5,
    //     -this.size.height * 0.5,
    //     this.size.width,
    //     this.size.height,
    //   );
    // }

    context.globalAlpha = this.opacity;
    if (this.filters.length > 0) {
      FilterRenderer.applyFilters(context, this.filters, this.drawImage);
    } else {
      this.drawImage(context);
    }
  }

  private drawImage = (
    context: CanvasRenderingContext2D,
  ): void => {
    if (this.isImageLoaded && this.image) {
      context.save();
      context.translate(this.position.x, this.position.y);
      context.rotate(toRadians(this.rotation));
      context.scale(this.scale.x, this.scale.y);
      context.drawImage(
        this.image,
        -this.size.width * 0.5,
        -this.size.height * 0.5,
        this.size.width,
        this.size.height,
      );
      context.restore();
    }
  };

  public loadImage(encodedImage: string): void {
    this.properties.set("encodedImage", encodedImage);
    this.image = new Image();
    this.image.src = encodedImage;
    this.image.onload = (): void => {
      if (this.image) {
        this.isImageLoaded = true;
        this.size = { width: this.image.width, height: this.image.height };
        this.boundingBox.update(this.position, this.size, this.rotation);
      }
    };
  }

  public getBoundingBox(): BoundingBox {
    const scaledSize = {
      width: this.size.width * this.scale.x,
      height: this.size.height * this.scale.y,
    };
    this.boundingBox.update(this.position, scaledSize, this.rotation);
    return this.boundingBox;
  }
}
