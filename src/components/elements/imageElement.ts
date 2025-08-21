import { Element } from "src/components/elements/element";
import type { IImageElementData, Position, Size } from "src/components/types";
import { FilterRenderer } from "src/filters/filterRenderer";
import { BoundingBox } from "src/utils/boundingBox";
import { CroppingBox } from "src/utils/croppingBox";
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
  private croppingBox: CroppingBox;
  public image: HTMLImageElement | null = null;
  private isImageLoaded = false;

  constructor(position: Position, size: Size, z: number) {
    super(position, size, z);
    this.properties.set("type", "image");
    this.properties.set("encodedImage", "");
    this.backgroundColor = "#00FF00";
    this.backgroundOpacity = 0;
    this.boundingBox = new BoundingBox(position, size, this.rotation);
    this.croppingBox = new CroppingBox(size);
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
        this.croppingBox.left,
        this.croppingBox.top,
        this.croppingBox.right,
        this.croppingBox.bottom,
        this.croppingBox.left + (-this.size.width * 0.5),
        this.croppingBox.top + (-this.size.height * 0.5),
        this.croppingBox.right,
        this.croppingBox.bottom,
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
        this.size = { width: this.image.width, height: this.image.height };
        this.boundingBox.update(this.position, this.size, this.rotation);
        this.croppingBox.updateSize(this.size);
        this.isImageLoaded = true;
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
