import { BoundingBox } from '../components/types'

export class BB {
  private bb: BoundingBox

  constructor(bb: BoundingBox) {
    this.bb = bb
  }

  public isBBWithin(outerBB: BoundingBox): boolean {
    const xStartInner = Math.min(this.bb.x1, this.bb.x2)
    const yStartInner = Math.min(this.bb.y1, this.bb.y2)
    const xEndInner = Math.max(this.bb.x1, this.bb.x2)
    const yEndInner = Math.max(this.bb.y1, this.bb.y2)

    const xStartOuter = Math.min(outerBB.x1, outerBB.x2)
    const yStartOuter = Math.min(outerBB.y1, outerBB.y2)
    const xEndOuter = Math.max(outerBB.x1, outerBB.x2)
    const yEndOuter = Math.max(outerBB.y1, outerBB.y2)

    return (
      xStartInner >= xStartOuter &&
      xEndInner <= xEndOuter &&
      yStartInner >= yStartOuter &&
      yEndInner <= yEndOuter
    )
  }
}
