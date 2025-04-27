export interface IThumbnailSpriteCell {
  index: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
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
