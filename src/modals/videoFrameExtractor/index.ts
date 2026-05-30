import "../../assets/main.css";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Alerts } from "src/components/alerts/alerts";
import type { ISelectInput } from "src/components/helpers/createSelectInput";
import createSelectInput from "src/components/helpers/createSelectInput";
import type { ISliderControl } from "src/components/helpers/createSliderControl";
import createSliderControl from "src/components/helpers/createSliderControl";
import { clamp } from "src/utils/easing";
import { EventBus } from "src/utils/eventBus";
import formatFrameIntoTime from "src/utils/formatFrameIntoTime";
import { ExtractBox } from "../../components/extractBox/extractBox";
import type { IThumbnailSpriteCell, IVideoMetadata } from "../../types";
import getElementById from "../../utils/getElementById";

const PREVIEW_CANVAS_HEIGHT = 432;
const PREVIEW_CANVAS_WIDTH = 768;

export class VideoFrameExtractor {
  private static instance: VideoFrameExtractor | null = null;
  private preview: {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  } | null = null;
  private extract: {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  } | null = null;
  private offScreen: {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  } | null = null;
  private videoMetadata: (IVideoMetadata & { videoRatio?: number }) | null =
    null;
  private videoDurationSlider: HTMLInputElement | null = null;
  private videoDurationIndicator: HTMLDivElement | null = null;
  private aspectRatioSelect: ISelectInput | null = null;
  private extractBox: ExtractBox | null = null;
  private videoInfoEl: HTMLDivElement | null = null;
  private xPosControl: ISliderControl | null = null;
  private yPosControl: ISliderControl | null = null;
  private widthControl: ISliderControl | null = null;
  private heightControl: ISliderControl | null = null;
  private currentThumbIndex = -1;
  private rafId: number | null = null;
  private thumbnailSprite: HTMLImageElement | null = null;
  private thumbnailSpriteCells: IThumbnailSpriteCell[] = [];
  private eventBus: EventBus;
  private scale: { x: number; y: number } = { x: 1, y: 1 };

  private constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.createDOMElements();
    this.init();
  }

  private async init(): Promise<void> {
    this.createEventListeners();
    await this.loadInitialMetadata();
  }

  private async loadInitialMetadata(): Promise<void> {
    const metadata = (window as unknown as Record<string, unknown>).__videoMetadata;
    if (metadata) {
      this.setupVideoMetadata(metadata as IVideoMetadata);
    }
  }

  private setupVideoMetadata(metadata: IVideoMetadata): void {
    this.videoMetadata = metadata;
    const { width, height } = metadata;
    this.videoMetadata.videoRatio = height / width;

    if (this.videoInfoEl) {
      const format = metadata.format || "";
      const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
      const g = gcd(width, height);
      this.videoInfoEl.textContent = `${width}×${height} px | ${width / g}:${height / g} | ${metadata.frameRate} fps${format ? ` | ${format.toUpperCase()}` : ""}`;
    }

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

    this.scale = { x: width / canvasWidth, y: height / canvasHeight };

    if (this.xPosControl && this.yPosControl && this.widthControl && this.heightControl) {
      this.xPosControl.setOptions({ min: 0, max: width });
      this.yPosControl.setOptions({ min: 0, max: height });
      this.widthControl.setOptions({ min: 10, max: width });
      this.heightControl.setOptions({ min: 10, max: height });
    }

    if (this.preview) {
      this.preview.canvas.width = canvasWidth;
      this.preview.canvas.height = canvasHeight;
      this.extractBox = new ExtractBox(this.preview.canvas, this.eventBus);
      if (this.aspectRatioSelect) {
        this.extractBox.setAspectRatio(this.aspectRatioSelect.getValue());
      }
    }

    if (this.offScreen) {
      this.offScreen.canvas.width = width;
      this.offScreen.canvas.height = height;
    }
    if (this.videoMetadata?.totalFrames && this.videoDurationSlider) {
      this.videoDurationSlider.max = (
        this.videoMetadata.totalFrames - 1
      ).toString();
      this.videoDurationSlider.step = "1";
    }
    invoke("generate_thumbnail_sprite", {
      filePath: metadata.filePath,
      duration: metadata.duration,
    })
      .then((response) => {
        const result = response as { success: boolean; data?: string };
        if (result.success) {
          this.loadThumbnailSprite(result.data as string);
        }
      })
      .catch(console.error);

    invoke("process_video_frame", {
      filePath: metadata.filePath,
      timeInSeconds: 0,
    })
      .then((response) => {
        const result = response as { success: boolean; data?: string };
        if (result.success) {
          this.loadFrameImage(result.data as string);
        }
      })
      .catch(console.error);
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
          img,
          0,
          0,
          this.offScreen.canvas.width,
          this.offScreen.canvas.height,
        );
        this.update();
      }
    };
    img.src = dataUrl;
  }

  private createDOMElements(): void {
    const previewCanvas = getElementById<HTMLCanvasElement>("video-canvas");
    this.aspectRatioSelect = createSelectInput(
      "vfe_aspect-ratio",
      "Proporção",
      {
        optionValues: [
          { label: "Personalizado", value: "custom" },
          { label: "1:1 (Quadrado)", value: "1:1" },
          { label: "4:3 (Tradicional)", value: "4:3" },
          { label: "5:7 (Retrato)", value: "5:7" },
          { label: "16:9 (Widescreen)", value: "16:9" },
          { label: "21:9 (Cinemascópio)", value: "21:9" },
        ],
        value: "16:9",
      },
      (value) => {
        if (this.extractBox) {
          this.extractBox.setAspectRatio(value);
        }
      },
    );
    this.aspectRatioSelect.enable();
    getElementById<HTMLDivElement>("vfe_aspect-ratio-container").appendChild(this.aspectRatioSelect.element);

    const extractCanvas = document.createElement("canvas");
    const offScreenCanvas = document.createElement("canvas");

    const previewContext = previewCanvas.getContext("2d");
    const extractContext = extractCanvas.getContext("2d");
    const offScreenContext = offScreenCanvas.getContext("2d");

    if (previewContext && extractContext && offScreenContext) {
      this.preview = { canvas: previewCanvas, context: previewContext };
      this.extract = { canvas: extractCanvas, context: extractContext };
      this.offScreen = { canvas: offScreenCanvas, context: offScreenContext };
    }

    this.videoDurationSlider =
      getElementById<HTMLInputElement>("sld_video-duration");
    this.videoDurationIndicator = getElementById<HTMLDivElement>(
      "vfe_video-duration-indicator",
    );

    this.videoInfoEl = getElementById<HTMLDivElement>("vfe_video-info");
    const transformControls = getElementById<HTMLDivElement>("vfe_transform-controls");

    const toPreview = (v: number, s: number) => Math.round(v / s);

    this.xPosControl = createSliderControl(
      "vfe_x-pos", "X",
      { min: 0, max: 10000, step: 1, value: 0 },
      (value) => { if (this.extractBox) { const p = this.extractBox.getPosition(); this.extractBox.setPosition(toPreview(value, this.scale.x), p.y); } },
      false,
    );
    this.xPosControl.enable();
    transformControls.appendChild(this.xPosControl.element);

    this.yPosControl = createSliderControl(
      "vfe_y-pos", "Y",
      { min: 0, max: 10000, step: 1, value: 0 },
      (value) => { if (this.extractBox) { const p = this.extractBox.getPosition(); this.extractBox.setPosition(p.x, toPreview(value, this.scale.y)); } },
      false,
    );
    this.yPosControl.enable();
    transformControls.appendChild(this.yPosControl.element);

    this.widthControl = createSliderControl(
      "vfe_width", "W",
      { min: 10, max: 10000, step: 1, value: 100 },
      (value) => { if (this.extractBox) { const s = this.extractBox.getSize(); this.extractBox.setSize(toPreview(value, this.scale.x), s.height); } },
      false,
    );
    this.widthControl.enable();
    transformControls.appendChild(this.widthControl.element);

    this.heightControl = createSliderControl(
      "vfe_height", "H",
      { min: 10, max: 10000, step: 1, value: 100 },
      (value) => { if (this.extractBox) { const s = this.extractBox.getSize(); this.extractBox.setSize(s.width, toPreview(value, this.scale.y)); } },
      false,
    );
    this.heightControl.enable();
    transformControls.appendChild(this.heightControl.element);

    getElementById<HTMLButtonElement>("vfe_btn-swap").addEventListener("click", () => {
      if (this.extractBox) {
        this.extractBox.swapSize();
        if (this.aspectRatioSelect?.getValue() && this.aspectRatioSelect.getValue() !== "custom") {
          this.aspectRatioSelect.setValue("custom");
        }
      }
    });
    getElementById<HTMLButtonElement>("vfe_btn-reset").addEventListener("click", () => {
      if (this.extractBox) this.extractBox.reset(this.aspectRatioSelect?.getValue() ?? null);
    });
  }

  private createEventListeners(): void {
    if (this.videoDurationSlider) {
      this.videoDurationSlider.addEventListener(
        "input",
        this.handleSliderInput.bind(this),
      );
      this.videoDurationSlider.addEventListener(
        "change",
        this.requestProcessFrame.bind(this),
      );
      window.addEventListener("keydown", this.handleKeyDown.bind(this));

      const seekButtons =
        document.querySelectorAll<HTMLButtonElement>("[data-seek]");
      seekButtons.forEach((button) => {
        button.addEventListener("click", this.handleSeekButton.bind(this));
      });
    }

    if (this.preview) {
      this.preview.canvas.addEventListener("mousedown", (evt) => {
        if (this.extractBox) {
          return this.extractBox.onMouseDown(evt);
        }
      });
      this.preview.canvas.addEventListener("mousemove", (evt) => {
        if (this.extractBox) {
          return this.extractBox.hoverHandle(evt);
        }
      });
    }

    this.eventBus.on("vfe:update", () => this.update());
    this.eventBus.on("vfe:extractbox:update", (payload) => {
      if (this.xPosControl && this.yPosControl && this.widthControl && this.heightControl) {
        const { x: sx, y: sy } = this.scale;
        this.xPosControl.setValue(Math.round(payload.position.x * sx));
        this.yPosControl.setValue(Math.round(payload.position.y * sy));
        this.widthControl.setValue(Math.round(payload.size.width * sx));
        this.heightControl.setValue(Math.round(payload.size.height * sy));
      }
    });

    listen("vfe:extract-frame", () => {
      if (this.extractBox) this.extractFrame();
    });

    listen("vfe:copy-frame", () => {
      if (this.extract?.canvas) this.extractFrame(true);
    });

    listen<IVideoMetadata>("vfe:video-metadata", (event) => {
      this.loadVideo(event.payload);
    });
  }

  public static getInstance(eventBus: EventBus): VideoFrameExtractor {
    if (VideoFrameExtractor.instance === null) {
      VideoFrameExtractor.instance = new VideoFrameExtractor(eventBus);
    }
    return VideoFrameExtractor.instance;
  }

  public loadVideo(metadata: IVideoMetadata): void {
    this.currentThumbIndex = -1;
    this.thumbnailSprite = null;
    this.thumbnailSpriteCells = [];
    if (this.videoDurationSlider) {
      this.videoDurationSlider.value = "0";
    }
    this.setupVideoMetadata(metadata);
  }

  private handleSliderInput(evt: Event): void {
    const slider = evt.currentTarget as HTMLInputElement;
    const totalFrames = this.videoMetadata?.totalFrames || Number(slider.max);
    const value = Number(slider.value);
    const ratio = value / (totalFrames - 1);

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.updateThumbnail(ratio);
      });
    }

    if (this.videoMetadata?.totalFrames && this.videoDurationIndicator) {
      const frameRate = this.videoMetadata.frameRate;
      this.videoDurationIndicator.textContent = formatFrameIntoTime(
        value,
        frameRate,
      );
    }
  }

  private handleKeyDown(evt: KeyboardEvent): void {
    if (!this.videoDurationSlider || !this.videoMetadata) return;

    const { code, repeat, shiftKey, ctrlKey } = evt;
    const slider = this.videoDurationSlider;
    const minValue = Number(slider.min);
    const maxValue = Number(slider.max);
    let currentValue = Number(slider.value);

    if (code === "KeyE") {
      if (ctrlKey && shiftKey) {
        currentValue = minValue;
      } else if (ctrlKey) {
        currentValue -= 5 * this.videoMetadata.frameRate;
      } else if (shiftKey) {
        currentValue -= this.videoMetadata.frameRate;
      } else {
        currentValue -= 1;
      }
    } else if (code === "KeyR") {
      if (ctrlKey && shiftKey) {
        currentValue = maxValue;
      } else if (ctrlKey) {
        currentValue += 5 * this.videoMetadata.frameRate;
      } else if (shiftKey) {
        currentValue += this.videoMetadata.frameRate;
      } else {
        currentValue += 1;
      }
    } else {
      return;
    }

    evt.preventDefault();
    const value = clamp(currentValue, minValue, maxValue);
    slider.value = value.toString();
    this.videoDurationSlider.dispatchEvent(new Event("input"));
    if (!repeat) {
      this.requestProcessFrame();
    }
  }

  private handleSeekButton(evt: MouseEvent): void {
    if (!this.videoDurationSlider || !this.videoMetadata) return;

    const button = evt.currentTarget as HTMLButtonElement;
    const seekValue = button.dataset.seek;
    if (!seekValue) return;

    const slider = this.videoDurationSlider;
    const minValue = Number(slider.min);
    const maxValue = Number(slider.max);
    let currentValue = Number(slider.value);

    if (seekValue === "start") {
      currentValue = minValue;
    } else if (seekValue === "end") {
      currentValue = maxValue;
    } else {
      const isTime = seekValue.endsWith("s");
      let delta;
      if (isTime) {
        delta = Number(seekValue.slice(0, -1)) * this.videoMetadata.frameRate;
      } else {
        delta = Number(seekValue);
      }

      currentValue += delta;
    }

    const value = clamp(currentValue, minValue, maxValue);
    slider.value = value.toString();
    this.videoDurationSlider.dispatchEvent(new Event("input"));
    this.requestProcessFrame();
  }

  private updateThumbnail(ratio: number): void {
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
    this.clearCanvas(context, canvas);
    context.drawImage(
      this.thumbnailSprite,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      canvas.width,
      canvas.height,
    );
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

      if (this.extract) {
        this.extract.canvas.width = scaledWidth;
        this.extract.canvas.height = scaledHeight;
        this.extract.context.putImageData(imageData, 0, 0);

        if (toClipboard) {
          this.extract.canvas.toBlob((blob) => {
            if (blob) {
              const item = new ClipboardItem({ "image/png": blob });
              navigator.clipboard.write([item]);
              this.eventBus.emit("alert:add", {
                message: "Frame do vídeo copiado para a área de transferência",
                title: "Copiado",
                type: "success",
              });
            }
          }, "image/png");
        } else {
          const imageUrl = this.extract.canvas.toDataURL("image/png");
          this.eventBus.emit("alert:add", {
            message: "Quadro do vídeo extraído para o Projeto",
            title: "Quadro Extraído",
            type: "success",
          });
          invoke("send_frame_to_work_area", { imageUrl }).catch(console.error);
        }
      }
    }
  }

  private requestProcessFrame(): void {
    if (this.videoMetadata && this.videoDurationSlider) {
      const value = Number(this.videoDurationSlider.value);
      const timeInSeconds = Math.min(
        value / this.videoMetadata.frameRate,
        this.videoMetadata.duration,
      );
      invoke("process_video_frame", {
        filePath: this.videoMetadata.filePath,
        timeInSeconds,
      })
        .then((response) => {
          const result = response as { success: boolean; data?: string };
          if (result.success) {
            this.loadFrameImage(result.data as string);
          }
        })
        .catch(console.error);
    }
  }
}

const alertEventBus = new EventBus();
new Alerts(alertEventBus);
const instance = VideoFrameExtractor.getInstance(alertEventBus);
(window as unknown as Record<string, unknown>).vfeInstance = instance;
