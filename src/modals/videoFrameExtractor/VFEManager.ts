import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ExtractBox } from "src/components/extractBox/extractBox";
import type { IThumbnailSpriteCell, IVideoMetadata } from "src/types";
import type { EventBus } from "src/utils/eventBus";

const PREVIEW_CANVAS_HEIGHT = 432;
const PREVIEW_CANVAS_WIDTH = 768;

export class VFEManager {
  private preview: { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D };
  private extract: { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D };
  private offScreen: { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D };
  private videoMetadata: (IVideoMetadata & { videoRatio?: number }) | null = null;
  private extractBox: ExtractBox | null = null;
  private thumbnailSprite: HTMLImageElement | null = null;
  private thumbnailSpriteCells: IThumbnailSpriteCell[] = [];
  private currentThumbIndex = -1;
  private rafId: number | null = null;
  private eventBus: EventBus;
  private scale: { x: number; y: number } = { x: 1, y: 1 };
  private unlistens: Array<() => void> = [];
  private unsubscribeUpdate: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, eventBus: EventBus) {
    this.eventBus = eventBus;

    const previewContext = canvas.getContext("2d");
    if (!previewContext) throw new Error("Could not get 2D context");
    this.preview = { canvas, context: previewContext };

    const extractCanvas = document.createElement("canvas");
    const offScreenCanvas = document.createElement("canvas");
    const extractContext = extractCanvas.getContext("2d");
    const offScreenContext = offScreenCanvas.getContext("2d");
    if (!extractContext || !offScreenContext) {
      throw new Error("Could not create offscreen canvases");
    }
    this.extract = { canvas: extractCanvas, context: extractContext };
    this.offScreen = { canvas: offScreenCanvas, context: offScreenContext };

    canvas.addEventListener("mousedown", (evt) => {
      if (this.extractBox) this.extractBox.onMouseDown(evt);
    });
    canvas.addEventListener("mousemove", (evt) => {
      if (this.extractBox) this.extractBox.hoverHandle(evt);
    });

    listen("vfe:extract-frame", () => {
      if (this.extractBox) this.extractFrame();
    }).then((unlisten) => this.unlistens.push(unlisten));

    listen("vfe:copy-frame", () => {
      if (this.extract?.canvas) this.extractFrame(true);
    }).then((unlisten) => this.unlistens.push(unlisten));

    const handleUpdate = () => this.update();
    this.unsubscribeUpdate = () => this.eventBus.off("vfe:update", handleUpdate);
    this.eventBus.on("vfe:update", handleUpdate);
  }

  getScale(): { x: number; y: number } {
    return { ...this.scale };
  }

  getMetadata(): (IVideoMetadata & { videoRatio?: number }) | null {
    return this.videoMetadata;
  }

  async loadVideo(metadata: IVideoMetadata): Promise<void> {
    this.currentThumbIndex = -1;
    this.thumbnailSprite = null;
    this.thumbnailSpriteCells = [];

    this.videoMetadata = metadata;
    const { width, height } = metadata;
    this.videoMetadata.videoRatio = height / width;

    let canvasWidth = PREVIEW_CANVAS_WIDTH;
    let canvasHeight = Math.ceil(PREVIEW_CANVAS_WIDTH * this.videoMetadata.videoRatio);
    if (canvasHeight > PREVIEW_CANVAS_HEIGHT) {
      canvasHeight = PREVIEW_CANVAS_HEIGHT;
      canvasWidth = Math.ceil(PREVIEW_CANVAS_HEIGHT / this.videoMetadata.videoRatio);
    }

    this.scale = { x: width / canvasWidth, y: height / canvasHeight };

    this.preview.canvas.width = canvasWidth;
    this.preview.canvas.height = canvasHeight;
    this.extractBox = new ExtractBox(this.preview.canvas, this.eventBus);

    this.offScreen.canvas.width = width;
    this.offScreen.canvas.height = height;

    this.eventBus.emit("vfe:extractbox:update", {
      position: this.extractBox.getPosition(),
      size: this.extractBox.getSize(),
    });

    const format = metadata.format || "";
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const g = gcd(width, height);
    const info = `${width}\u00D7${height} px | ${width / g}:${height / g} | ${metadata.frameRate} fps${format ? ` | ${format.toUpperCase()}` : ""}`;
    this.eventBus.emit("vfe:metadata-loaded", {
      info,
      totalFrames: metadata.totalFrames ?? 0,
      frameRate: metadata.frameRate,
      filePath: metadata.filePath,
    });

    try {
      const response = await invoke("generate_thumbnail_sprite", {
        filePath: metadata.filePath,
        duration: metadata.duration,
      }) as { success: boolean; data?: string };
      if (response.success && response.data) {
        this.loadThumbnailSprite(response.data);
      }
    } catch (err) {
      console.error(err);
    }

    try {
      const response = await invoke("process_video_frame", {
        filePath: metadata.filePath,
        timeInSeconds: 0,
      }) as { success: boolean; data?: string };
      if (response.success && response.data) {
        this.loadFrameImage(response.data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  seekFrame(frameIndex: number): void {
    if (!this.videoMetadata) return;
    const timeInSeconds = Math.min(
      frameIndex / this.videoMetadata.frameRate,
      this.videoMetadata.duration,
    );
    invoke("process_video_frame", {
      filePath: this.videoMetadata.filePath,
      timeInSeconds,
    })
      .then((response) => {
        const result = response as { success: boolean; data?: string };
        if (result.success && result.data) {
          this.loadFrameImage(result.data);
        }
      })
      .catch(console.error);
  }

  scrubTo(ratio: number): void {
    if (
      !this.preview ||
      !this.thumbnailSprite ||
      !this.thumbnailSpriteCells.length
    )
      return;

    let index = Math.round(ratio * (this.thumbnailSpriteCells.length - 1));
    index = Math.max(0, Math.min(index, this.thumbnailSpriteCells.length - 1));

    if (index === this.currentThumbIndex) return;
    this.currentThumbIndex = index;
    const cell = this.thumbnailSpriteCells[index];
    const { sx, sy, sw, sh } = cell;
    const { canvas, context } = this.preview;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      this.thumbnailSprite,
      sx, sy, sw, sh,
      0, 0,
      canvas.width, canvas.height,
    );
  }

  setAspectRatio(value: string): void {
    this.extractBox?.setAspectRatio(value);
  }

  swapSize(): void {
    this.extractBox?.swapSize();
  }

  reset(aspectRatio: string | null): void {
    this.extractBox?.reset(aspectRatio);
  }

  setPosition(x: number, y: number): void {
    this.extractBox?.setPosition(x, y);
  }

  setSize(w: number, h: number): void {
    this.extractBox?.setSize(w, h);
  }

  getExtractBoxPosition(): { x: number; y: number } | null {
    return this.extractBox?.getPosition() ?? null;
  }

  getExtractBoxSize(): { width: number; height: number } | null {
    return this.extractBox?.getSize() ?? null;
  }

  extractFrame(toClipboard = false): void {
    if (!this.offScreen || !this.preview || !this.extractBox) return;

    const { width: previewWidth, height: previewHeight } = this.preview.canvas;
    const { width: originalWidth, height: originalHeight } = this.offScreen.canvas;

    const scaleX = originalWidth / previewWidth;
    const scaleY = originalHeight / previewHeight;

    const { x1, x2, y1, y2 } = this.extractBox.getBoundingBox();
    const scaledXPos = x1 * scaleX;
    const scaledWidth = x2 * scaleX;
    const scaledYPos = y1 * scaleY;
    const scaledHeight = y2 * scaleY;

    const imageData = this.offScreen.context.getImageData(
      scaledXPos, scaledYPos, scaledWidth, scaledHeight,
    );

    this.extract.canvas.width = scaledWidth;
    this.extract.canvas.height = scaledHeight;
    this.extract.context.putImageData(imageData, 0, 0);

    if (toClipboard) {
      this.extract.canvas.toBlob((blob) => {
        if (blob) {
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard.write([item]);
          this.eventBus.emit("alert:add", {
            message: "Frame do v\u00EDdeo copiado para a \u00E1rea de transfer\u00EAncia",
            title: "Copiado",
            type: "success",
          });
        }
      }, "image/png");
    } else {
      const imageUrl = this.extract.canvas.toDataURL("image/png");
      this.eventBus.emit("alert:add", {
        message: "Quadro do v\u00EDdeo extra\u00EDdo para o Projeto",
        title: "Quadro Extra\u00EDdo",
        type: "success",
      });
      invoke("send_frame_to_work_area", { imageUrl }).catch(console.error);
    }
  }

  destroy(): void {
    if (this.unsubscribeUpdate) {
      this.unsubscribeUpdate();
      this.unsubscribeUpdate = null;
    }
    this.unlistens.forEach((fn) => fn());
    this.unlistens = [];
  }

  private loadThumbnailSprite(dataUrl: string): void {
    this.thumbnailSprite = new Image();
    this.thumbnailSprite.src = dataUrl;
    this.thumbnailSprite.onload = () => {
      const cols = 10;
      const rows = 10;
      if (this.thumbnailSprite) {
        const sw = this.thumbnailSprite.width / cols;
        const sh = this.thumbnailSprite.height / rows;
        this.thumbnailSpriteCells = [];
        let index = 0;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            this.thumbnailSpriteCells.push({
              index: index++,
              sx: x * sw,
              sy: y * sh,
              sw,
              sh,
            });
          }
        }
      }
    };
  }

  private loadFrameImage(dataUrl: string): void {
    if (!this.offScreen || !this.preview || !this.videoMetadata) return;
    const img = new Image();
    img.onload = () => {
      if (this.offScreen) {
        this.offScreen.context.drawImage(
          img, 0, 0,
          this.offScreen.canvas.width,
          this.offScreen.canvas.height,
        );
        this.update();
      }
    };
    img.src = dataUrl;
  }

  private update(): void {
    if (this.offScreen && this.preview) {
      this.preview.context.clearRect(0, 0, this.preview.canvas.width, this.preview.canvas.height);
      this.preview.context.save();
      this.preview.context.drawImage(
        this.offScreen.canvas,
        0, 0,
        this.offScreen.canvas.width,
        this.offScreen.canvas.height,
        0, 0,
        this.preview.canvas.width,
        this.preview.canvas.height,
      );
      this.preview.context.restore();
    }
    if (this.extractBox) {
      this.extractBox.draw();
    }
  }
}
