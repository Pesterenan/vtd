import type { TBoundingBox, Position } from "../components/types";

export class BB {
  private bb: TBoundingBox;

  constructor(center: Position, radius: number);
  constructor(bb: TBoundingBox);

  constructor(bbOrCenter: TBoundingBox | Position, radius?: number) {
    if (typeof radius === "number" && "x" in bbOrCenter && "y" in bbOrCenter) {
      const center = bbOrCenter as Position;
      this.bb = {
        x1: center.x - radius,
        x2: center.x + radius,
        y1: center.y - radius,
        y2: center.y + radius,
      };
    } else {
      this.bb = bbOrCenter as TBoundingBox;
    }
  }

  public isPointWithinBB(point: Position): boolean {
    const xStartInner = Math.min(this.bb.x1, this.bb.x2);
    const yStartInner = Math.min(this.bb.y1, this.bb.y2);
    const xEndInner = Math.max(this.bb.x1, this.bb.x2);
    const yEndInner = Math.max(this.bb.y1, this.bb.y2);

    return (
      xStartInner <= point.x &&
      xEndInner >= point.x &&
      yStartInner <= point.y &&
      yEndInner >= point.y
    );
  }

  public isBBWithin(outerBB: TBoundingBox): boolean {
    const xStartInner = Math.min(this.bb.x1, this.bb.x2);
    const yStartInner = Math.min(this.bb.y1, this.bb.y2);
    const xEndInner = Math.max(this.bb.x1, this.bb.x2);
    const yEndInner = Math.max(this.bb.y1, this.bb.y2);

    const xStartOuter = Math.min(outerBB.x1, outerBB.x2);
    const yStartOuter = Math.min(outerBB.y1, outerBB.y2);
    const xEndOuter = Math.max(outerBB.x1, outerBB.x2);
    const yEndOuter = Math.max(outerBB.y1, outerBB.y2);

    return (
      xStartInner >= xStartOuter &&
      xEndInner <= xEndOuter &&
      yStartInner >= yStartOuter &&
      yEndInner <= yEndOuter
    );
  }
}
