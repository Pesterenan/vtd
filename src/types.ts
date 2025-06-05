export interface IThumbnailSpriteCell {
  index: number;
  sh: number;
  sw: number;
  sx: number;
  sy: number;
}

export interface IVideoMetadata {
  duration: number;
  filePath: string;
  format?: string;
  frameRate: number;
  height: number;
  totalFrames: number;
  width: number;
}
