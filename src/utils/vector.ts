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

  add(that: Vectorizable) {
    const thatVector = new Vector(that);
    return { x: this.x + thatVector.x, y: this.y + thatVector.y };
  }

  sub(that: Vectorizable) {
    const thatVector = new Vector(that);
    return { x: this.x - thatVector.x, y: this.y - thatVector.y };
  }

  div(scalar: number) {
    if (scalar !== 0) {
      return { x: this.x / scalar, y: this.y / scalar };
    }
    return { x: 0, y: 0 };
  }

  mul(scalar: number) {
    return { x: this.x * scalar, y: this.y * scalar };
  }

  mid(that: Vectorizable) {
    const thatVector = new Vector(that);
    return new Vector(new Vector(thatVector.sub(this)).div(2)).add(this);
  }
}
