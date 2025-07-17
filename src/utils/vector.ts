import type { Position, Size } from "src/components/types";

type Vectorizable = Position | Size;

export class Vector {
  x = 0;
  y = 0;

  constructor(vector: Vectorizable) {
    if ("x" in vector && "y" in vector) {
      this.x = vector.x;
      this.y = vector.y;
    } else if ("width" in vector && "height" in vector) {
      this.x = vector.width;
      this.y = vector.height;
    }
  }

  add(other: Vectorizable) {
    const that = new Vector(other);
    this.x += that.x;
    this.y += that.y;
    return this;
  }

  sub(other: Vectorizable) {
    const that = new Vector(other);
    this.x -= that.x;
    this.y -= that.y;
    return this;
  }

  div(scalar: number) {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
      return this;
    }
    this.x = 0;
    this.y = 0;
    return this;
  }

  mul(scalar: number) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  mid(other: Vectorizable) {
    const that = new Vector(other);
    return that.sub(this).div(2).add(this);
  }

  distance(other: Vectorizable) {
    const that = new Vector(other);
    const dx = this.x - that.x;
    const dy = this.y - that.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  dot(other: Vectorizable) {
    const that = new Vector(other);
    return this.x * that.x + this.y * that.y;
  }

  magnitudeSq() {
    return this.x * this.x + this.y * this.y;
  }
}
