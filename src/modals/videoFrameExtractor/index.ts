import "../../assets/main.css";
import getElementById from "../../utils/getElementById";
import { IVideoMetadata } from "../../types";
import { ExtractBox } from "../../components/extractBox/extractBox";
import EVENT from "../../utils/customEvents";

const PREVIEW_CANVAS_HEIGHT = 432;
const PREVIEW_CANVAS_WIDTH = 768;

export class VideoFrameExtractor {
  private static instance: VideoFrameExtractor | null = null;
  private extractFrameBtn: HTMLButtonElement;
  private copyToClipBoardBtn: HTMLButtonElement;
  private preview: {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  } | null = null;
  private extract: {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  } | null = null;
  private offScreen: {
    canvas: OffscreenCanvas;
    context: OffscreenCanvasRenderingContext2D;
  } | null = null;
  private videoMetadata: (IVideoMetadata & { videoRatio?: number }) | null =
    null;
  private slider: HTMLInputElement;
  private extractBox: ExtractBox | null = null;

  private constructor() {
    const previewCanvas = getElementById<HTMLCanvasElement>("video-canvas");
    const extractCanvas = document.createElement("canvas");
    const offScreenCanvas = new OffscreenCanvas(0, 0);

    const previewContext = previewCanvas.getContext("2d");
    const extractContext = extractCanvas.getContext("2d");
    const offScreenContext = offScreenCanvas.getContext("2d");

    if (previewContext && extractContext && offScreenContext) {
      this.preview = { canvas: previewCanvas, context: previewContext };
      this.extract = { canvas: extractCanvas, context: extractContext };
      this.offScreen = { canvas: offScreenCanvas, context: offScreenContext };
    }

    this.extractFrameBtn =
      getElementById<HTMLButtonElement>("btn_extract-frame");
    this.extractFrameBtn.classList.add("btn-common");
    this.copyToClipBoardBtn = getElementById<HTMLButtonElement>(
      "btn_copy-to-clipboard",
    );
    this.copyToClipBoardBtn.classList.add("btn-common");
    this.slider = getElementById<HTMLInputElement>("slider");

    this.createEventListeners();
  }

  private createEventListeners(): void {
    this.slider.oninput = this.requestProcessFrame.bind(this);
    if (this.preview) {
      this.preview.canvas.addEventListener("mousedown", (evt) => {
        if (this.extractBox) {
          return this.extractBox.onClick(evt);
        }
      });
    }

    window.addEventListener(EVENT.UPDATE_VFE, () => this.update());

    window.api.onVideoMetadata((metadata: IVideoMetadata) => {
      this.videoMetadata = metadata;
      const { width, height } = metadata;
      this.videoMetadata.videoRatio = height / width;

      let canvasWidth = PREVIEW_CANVAS_WIDTH;
      let canvasHeight = Math.ceil(
        PREVIEW_CANVAS_WIDTH * this.videoMetadata.videoRatio,
      );
      if (canvasHeight > PREVIEW_CANVAS_HEIGHT) {
        canvasHeight = PREVIEW_CANVAS_HEIGHT;
        canvasWidth = Math.ceil(
          PREVIEW_CANVAS_HEIGHT / this.videoMetadata.videoRatio,
        );
      }

      if (this.preview) {
        this.preview.canvas.width = canvasWidth;
        this.preview.canvas.height = canvasHeight;
        this.extractBox = new ExtractBox(this.preview.canvas);
        this.extractFrameBtn.onclick = (): void => {
          if (this.extractBox) {
            this.extractFrame();
          } else {
            console.error("Extract Box not initialized");
          }
        };
        this.copyToClipBoardBtn.onclick = (): void => {
          if (this.extract?.canvas) {
            this.extractFrame(true);
          } else {
            console.error("Extract Box not initialized");
          }
        };
      }

      if (this.offScreen) {
        this.offScreen.canvas.width = width;
        this.offScreen.canvas.height = height;
      }
      window.api.processVideoFrame(this.videoMetadata.filePath, 0);
    });

    window.api.onProcessVideoFrameResponse((_, response) => {
      if (response.success) {
        if (this.offScreen && this.preview && this.videoMetadata) {
          const { width, height } = this.offScreen.canvas;
          const videoFrame = new Uint8ClampedArray(response.data as Uint8Array);
          const videoFrameData = new ImageData(videoFrame, width, height);
          this.offScreen.context.putImageData(videoFrameData, 0, 0);
          this.update();
          console.log(response.message);
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

  private update(): void {
    if (this.offScreen && this.preview && this.videoMetadata) {
      this.clearCanvas(this.preview.context, this.preview.canvas);
      const { width, height } = this.offScreen.canvas;
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
        this.preview.canvas.height,
      );
      this.preview.context.restore();
    }
    if (this.extractBox) {
      this.extractBox.draw();
    }
  }

  private clearCanvas(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ): void {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  /** Copies the image from the `offScreen.canvas` within a selection to the `extract.canvas` so it
   * can be sent to the WorkArea as a new element or copied to clipboard.
   * @param {boolean} toClipboard - if true, copies extracted area to clipboard instead.
   */
  private extractFrame(toClipboard = false): void {
    if (this.offScreen && this.preview && this.extractBox) {
      const { width: previewWidth, height: previewHeight } =
        this.preview.canvas;
      const { width: originalWidth, height: originalHeight } =
        this.offScreen.canvas;

      const scaleX = originalWidth / previewWidth;
      const scaleY = originalHeight / previewHeight;

      const { x1, x2, y1, y2 } = this.extractBox.getBoundingBox();
      const scaledXPos = x1 * scaleX;
      const scaledWidth = x2 * scaleX;
      const scaledYPos = y1 * scaleY;
      const scaledHeight = y2 * scaleY;

      const imageData = this.offScreen.context.getImageData(
        scaledXPos,
        scaledYPos,
        scaledWidth,
        scaledHeight,
      );

      // Atualize o canvas de extração
      if (this.extract) {
        this.extract.canvas.width = scaledWidth;
        this.extract.canvas.height = scaledHeight;
        this.extract.context.putImageData(imageData, 0, 0);

        if (toClipboard) {
          this.extract.canvas.toBlob((blob) => {
            if (blob) {
              const item = new ClipboardItem({ "image/png": blob });
              // TODO: Criar um sistema de alerts na aplicação para mostrar que foi copiado.
              navigator.clipboard.write([item]);
            }
          }, "image/png");
        } else {
          const imageUrl = this.extract.canvas.toDataURL("image/png");
          window.api.sendFrameToWorkArea(imageUrl);
        }
      }
    }
  }

  /** Queries the video file with the slider value to process the resulting frame */
  private requestProcessFrame(): void {
    if (this.videoMetadata) {
      const sliderValueInterpolated =
        (this.videoMetadata.duration * Number(this.slider.value)) / 100;
      window.api.processVideoFrame(
        this.videoMetadata.filePath,
        sliderValueInterpolated,
      );
    }
  }
}

VideoFrameExtractor.getInstance();
