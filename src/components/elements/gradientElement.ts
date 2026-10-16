import { Element } from "src/components/elements/element";
import type {
  IColorStop,
  IGradientElementData,
  Position,
  Size,
} from "src/components/types";
import { FilterRenderer } from "src/filters/filterRenderer";
import { hexToRgba } from "src/utils/color";
import { BoundingBox } from "src/utils/boundingBox";
import { rotatePoint } from "src/utils/transforms";
import { Vector } from "src/utils/vector";

export class GradientElement extends Element {
  public get position(): Position {
    return this.properties.get("position") as Position;
  }
  public set position(value: Position) {
    super.position = value;
  }
  protected onPositionChanged(delta: Position): void {
    if (!this.startPosition || !this.endPosition) return;
    this.startPosition = {
      x: this.startPosition.x + delta.x,
      y: this.startPosition.y + delta.y,
    };
    this.endPosition = {
      x: this.endPosition.x + delta.x,
      y: this.endPosition.y + delta.y,
    };
  }
  public get rotation(): number {
    return this.properties.get("rotation") as number;
  }
  public set rotation(value: number) {
    super.rotation = value;
  }
  protected onRotationChanged(deltaAngle: number): void {
    if (!this.startPosition || !this.endPosition) return;
    this.startPosition = rotatePoint(
      this.startPosition,
      this.position,
      deltaAngle,
    );
    this.endPosition = rotatePoint(
      this.endPosition,
      this.position,
      deltaAngle,
    );
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
  public get gradientFormat(): IGradientElementData["gradientFormat"] {
    return this.properties.get(
      "gradientFormat",
    ) as IGradientElementData["gradientFormat"];
  }
  public set gradientFormat(value: IGradientElementData["gradientFormat"]) {
    this.properties.set("gradientFormat", value);
  }
  public sortColorStops(): void {
    this.colorStops.sort((a, b) => a.portion - b.portion);
  }
  private boundingBox: BoundingBox;

  constructor(position: Position, size: Size, z: number) {
    super(position, size, z);
    this.properties.set("type", "gradient");
    this.startPosition = { x: -position.x, y: -position.y };
    this.endPosition = { x: position.x, y: position.y };
    this.colorStops = [
      { portion: 0.0, color: "#000000", alpha: 1.0 },
      { portion: 1.0, color: "#FFFFFF", alpha: 0.0 },
    ];
    this.gradientFormat = "linear";
    this.boundingBox = new BoundingBox(position, size, this.rotation);
  }

  public deserialize(data: IGradientElementData): void {
    super.deserialize(data);
  }

  public serialize(): IGradientElementData {
    return super.serialize() as IGradientElementData;
  }

  public draw(context: CanvasRenderingContext2D): void {
    if (!this.isVisible) return;
    context.globalAlpha = this.opacity;
    if (this.filters.length) {
      FilterRenderer.applyFilters(context, this.filters, this.drawGradient);
    } else {
      this.drawGradient(context);
    }
  }

  private drawGradient = (context: CanvasRenderingContext2D): void => {
    context.save();
    let gradient: CanvasGradient | null = null;
    switch (this.gradientFormat) {
      case "conic": {
        const { x, y } = new Vector(this.endPosition).sub(this.startPosition);
        const angleInRadians = Math.atan2(y, x);
        gradient = context.createConicGradient(
          angleInRadians,
          this.startPosition.x,
          this.startPosition.y,
        );
        break;
      }
      case "radial":
        gradient = context.createRadialGradient(
          this.startPosition.x,
          this.startPosition.y,
          0,
          this.startPosition.x,
          this.startPosition.y,
          new Vector(this.startPosition).distance(this.endPosition),
        );
        break;
      case "linear":
      default:
        gradient = context.createLinearGradient(
          this.startPosition.x,
          this.startPosition.y,
          this.endPosition.x,
          this.endPosition.y,
        );
        break;
    }

    if (gradient) {
      for (const cs of this.colorStops) {
        gradient.addColorStop(cs.portion, hexToRgba(cs.color, cs.alpha));
      }

      context.fillStyle = gradient;
    }
    context.fillRect(0, 0, this.size.width, this.size.height);
    context.restore();
  };

  public getBoundingBox(): BoundingBox {
    this.boundingBox.update(this.position, this.size, this.rotation);
    return this.boundingBox;
  }
}
