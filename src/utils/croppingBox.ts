import type { Size } from "src/components/types";

export class CroppingBox {
  public top: number;
  public bottom: number;
  public left: number;
  public right: number;

  constructor(size: Size) {
    this.top = 0;
    this.left = 0;
    this.right = size.width;
    this.bottom = size.height;
  }

  public updateSize(size: Size): void {
    this.top = 0;
    this.left = 0;
    this.right = size.width;
    this.bottom = size.height;
  }
}
