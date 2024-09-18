import getElementById from '../../utils/getElementById';
import { IVideoMetadata } from '../../../const/types';

const PREVIEW_CANVAS_HEIGHT = 432;
const PREVIEW_CANVAS_WIDTH = 768;

export class VideoFrameExtractor {
  private static instance: VideoFrameExtractor | null = null;
  private extractFrameBtn: HTMLButtonElement;
  private preview: { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null = null;
  private extract: { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null = null;
  private offScreen: {
    canvas: OffscreenCanvas;
    context: OffscreenCanvasRenderingContext2D;
  } | null = null;
  private videoMetadata: (IVideoMetadata & { videoRatio?: number }) | null = null;
  private slider: HTMLInputElement;

  private constructor() {
    const previewCanvas = getElementById<HTMLCanvasElement>('video-canvas');
    const extractCanvas = document.createElement('canvas');
    const offScreenCanvas = new OffscreenCanvas(0, 0);

    const previewContext = previewCanvas.getContext('2d');
    const extractContext = extractCanvas.getContext('2d');
    const offScreenContext = offScreenCanvas.getContext('2d');

    this.preview = { canvas: previewCanvas, context: previewContext! };
    this.extract = { canvas: extractCanvas, context: extractContext! };
    this.offScreen = { canvas: offScreenCanvas, context: offScreenContext! };

    this.extractFrameBtn = getElementById<HTMLButtonElement>('btn_extract-frame');
    this.slider = getElementById<HTMLInputElement>('slider');

    this.createEventListeners();
  }

  private createEventListeners(): void {
    this.extractFrameBtn.onclick = this.extractFrame.bind(this);
    this.slider.oninput = this.requestProcessFrame.bind(this);

    // @ts-ignore defined in main.ts
    window.api.onVideoMetadata((metadata: IVideoMetadata) => {
      this.videoMetadata = metadata;
      const { width, height } = metadata;
      this.videoMetadata.videoRatio = height / width;

      let canvasWidth = PREVIEW_CANVAS_WIDTH;
      let canvasHeight = Math.ceil(PREVIEW_CANVAS_WIDTH * this.videoMetadata.videoRatio);
      if (canvasHeight > PREVIEW_CANVAS_HEIGHT) {
        canvasHeight = PREVIEW_CANVAS_HEIGHT;
        canvasWidth = Math.ceil(PREVIEW_CANVAS_HEIGHT / this.videoMetadata.videoRatio);
      }

      if (this.preview) {
        this.preview.canvas.width = canvasWidth;
        this.preview.canvas.height = canvasHeight;
      }

      if (this.offScreen) {
        this.offScreen.canvas.width = width;
        this.offScreen.canvas.height = height;
      }
    });

    // @ts-ignore defined in main.ts
    window.api.onProcessVideoFrameResponse((_, response) => {
      if (response.success) {
        const videoFrame = new Uint8ClampedArray(response.data);

        if (this.offScreen && this.preview && this.videoMetadata) {
          const { width, height } = this.offScreen.canvas;

          const videoFrameData = new ImageData(videoFrame, width, height);
          this.offScreen.context.putImageData(videoFrameData, 0, 0);

          this.preview.context.clearRect(
            0,
            0,
            this.preview.canvas.width,
            this.preview.canvas.height
          );
          this.preview.context.save();
          this.preview.context.drawImage(
            this.offScreen.canvas,
            0,
            0,
            width,
            height,
            0,
            0,
            this.preview.canvas.width,
            this.preview.canvas.height
          );
          this.preview.context.restore();
        }
      } else {
        console.error(response.message);
      }
    });
  }

  public static getInstance(): VideoFrameExtractor {
    if (this.instance === null) {
      this.instance = new VideoFrameExtractor();
    }
    return this.instance;
  }

  /** Copies the image from the `offScreen.canvas` within a selection to the `extract.canvas` so it
   * can be sent to the WorkArea as a new element.
   * @param selection - Area to extract from the frame.
   * */
  private extractFrame(): void {
    if (this.offScreen) {
      const { width, height } = this.offScreen.canvas;
      const imageData = this.offScreen.context.getImageData(0, 0, width, height);
      if (this.extract) {
        this.extract.canvas.width = width;
        this.extract.canvas.height = height;
        this.extract.context.putImageData(imageData, 0, 0);
        const imageUrl = this.extract.canvas.toDataURL('image/png');
        // @ts-ignore defined in main.ts
        window.api.sendFrameToWorkArea(imageUrl);
      }
    }
  }

  /** Queries the video file with the slider value to process the resulting frame */
  private requestProcessFrame(): void {
    if (this.videoMetadata) {
      const sliderValueInterpolated =
        (this.videoMetadata.duration * Number(this.slider.value)) / 100;
      // @ts-ignore defined in main.ts
      window.api.processVideoFrame(this.videoMetadata.filePath, sliderValueInterpolated);
    }
  }
}

VideoFrameExtractor.getInstance();
