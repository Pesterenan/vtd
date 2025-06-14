import { Element } from "src/components/elements/element";
import type {
  IColorStop,
  IGradientElementData,
  Position,
  Size,
} from "src/components/types";
import { BoundingBox } from "src/utils/boundingBox";

export class GradientElement extends Element<IGradientElementData> {
  public get position(): Position {
    return this.properties.get("position") as Position;
  }
  public set position(value: Position) {
    if (this.startPosition && this.endPosition) {
      this.startPosition = {
        x: this.startPosition.x - (this.position.x - value.x),
        y: this.startPosition.y - (this.position.y - value.y),
      };
      this.endPosition = {
        x: this.endPosition.x - (this.position.x - value.x),
        y: this.endPosition.y - (this.position.y - value.y),
      };
    }
    this.properties.set("position", value);
  }
  public get rotation(): number {
    return this.properties.get("rotation") as number;
  }
  public set rotation(value: number) {
    this.properties.set("rotation", value);
  }
  public get startPosition(): Position {
    return this.properties.get("startPosition") as Position;
  }
  public set startPosition(value: Position) {
    this.properties.set("startPosition", value);
  }
  public get endPosition(): Position {
    return this.properties.get("endPosition") as Position;
  }
  public set endPosition(value: Position) {
    this.properties.set("endPosition", value);
  }
  public get colorStops(): IColorStop[] {
    return this.properties.get("colorStops") as IColorStop[];
  }
  public set colorStops(value: IColorStop[]) {
    this.properties.set("colorStops", value);
  }
  private boundingBox: BoundingBox;

  constructor(position: Position, size: Size, z: number) {
    super(position, size, z);
    this.properties.set("type", "gradient");
    this.startPosition = { x: -position.x, y: -position.y };
    this.endPosition = { x: position.x, y: position.y };
    this.colorStops = [
      { portion: 0.0, color: "#000000", alpha: 1.0 },
      { portion: 1.0, color: "#FFFFFF", alpha: 1.0 },
    ];
    this.boundingBox = new BoundingBox(position, size, this.rotation);
  }

  public deserialize(data: IGradientElementData): void {
    super.deserialize(data);
  }

  public serialize(): IGradientElementData {
    return super.serialize();
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;
    context.save();
    const gradient = context.createLinearGradient(
      this.startPosition.x,
      this.startPosition.y,
      this.endPosition.x,
      this.endPosition.y,
    );

    for (const cs of this.colorStops) {
      gradient.addColorStop(cs.portion, this.hexToRgba(cs.color, cs.alpha));
    }

    context.fillStyle = gradient;
    context.fillRect(0, 0, this.size.width, this.size.height);
    context.restore();
  }

  public getBoundingBox(): BoundingBox {
    this.boundingBox.update(this.position, this.size, this.rotation);
    return this.boundingBox;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = Number.parseInt(hex[1] + hex[2], 16);
    const g = Number.parseInt(hex[3] + hex[4], 16);
    const b = Number.parseInt(hex[5] + hex[6], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
