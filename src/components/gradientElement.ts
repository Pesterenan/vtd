import { Element } from "./element";
import { BoundingBox, IGradientElementData, Position, Size } from "./types";

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
    console.log(value, "rot");
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
  public get colorStops(): { portion: number; color: string }[] {
    return this.properties.get("colorStops") as {
      portion: number;
      color: string;
    }[];
  }
  public set colorStops(value: { portion: number; color: string }[]) {
    this.properties.set("colorStops", value);
  }

  constructor(position: Position, size: Size, z: number) {
    super(position, size, z);
    this.properties.set("type", "gradient");
    this.startPosition = { x: -position.x, y: -position.y };
    this.endPosition = { x: position.x, y: position.y };
    console.log(this.startPosition, this.endPosition);
    this.colorStops = [
      { portion: 0.0, color: "black" },
      { portion: 1.0, color: "rgba(255,100,0,0.0)" },
    ];
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
      gradient.addColorStop(cs.portion, cs.color);
    }

    context.fillStyle = gradient;
    context.fillRect(0, 0, this.size.width, this.size.height);
    context.restore();
  }

  public getTransformedBoundingBox(): BoundingBox {
    return { x1: 0, x2: this.size.width, y1: 0, y2: this.size.height };
  }
}
