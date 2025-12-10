import type { Size } from "src/components/types";

export interface ICroppingBoxData {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export class CroppingBox {
  public top: number;
  public bottom: number;
  public left: number;
  public right: number;
  private originalSize: Size;

  constructor(size: Size) {
    this.top = 0;
    this.left = 0;
    this.right = size.width;
    this.bottom = size.height;
    this.originalSize = { ...size };
  }

  public serialize = (): ICroppingBoxData => {
    return {
      top: this.top,
      bottom: this.bottom,
      left: this.left,
      right: this.right,
    };
  };

  public deserialize = (data: ICroppingBoxData): void => {
    this.top = data.top;
    this.bottom = data.bottom;
    this.left = data.left;
    this.right = data.right;
  };

  public updateSize(size: Size): void {
    this.top = 0;
    this.left = 0;
    this.right = size.width;
    this.bottom = size.height;
    this.originalSize = { ...size };
  }

  public isCropped(): boolean {
    return (
      this.top !== 0 ||
      this.left !== 0 ||
      this.right !== this.originalSize.width ||
      this.bottom !== this.originalSize.height
    );
  }

  public reset(): void {
    this.top = 0;
    this.left = 0;
    this.right = this.originalSize.width;
    this.bottom = this.originalSize.height;
  }
}
