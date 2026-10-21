/**
 * @vitest-environment jsdom
 *
 * RED tests for tasks 4 and 5 of `.plans/main/DEVELOPMENT_PLAN.md`:
 * `ImageElement.getCropRegion()`, the readiness guard of
 * `getCroppedImageDataUrl()` and the `onerror` branch of `loadImage()`.
 *
 * jsdom does not rasterize canvas: the 2D context comes from the shared mock
 * installed by `vitest.setup.ts` (the very same instance returned by
 * `getContext("2d")`), and `toDataURL` is stubbed here. `Image` is stubbed
 * because jsdom never loads images — without it `loadImage` never resolves.
 */
import type { Mock } from "vitest";
import type { Position, Size } from "src/components/types";
import { ImageElement } from "./imageElement";

const STUB_DATA_URL = "data:image/png;base64,STUB";
const SOURCE_DATA_URL = "data:image/png;base64,SOURCE";
const ELEMENT_POSITION: Position = { x: 100, y: 200 };
const IMAGE_SIZE: Size = { width: 300, height: 200 };
/** Cropping box in LOCAL units relative to the element center. */
const CROP_BOX = { left: 50, top: 20, right: 150, bottom: 120 };
const EXPECTED_REGION_WIDTH = 100;
const EXPECTED_REGION_HEIGHT = 100;
const EXPECTED_CENTER_OFFSET: Position = { x: -50, y: -30 };

interface MockContext2D {
  drawImage: Mock;
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: ImageSmoothingQuality;
}

interface StubImageOptions {
  width: number;
  height: number;
  fail: boolean;
}

/**
 * jsdom has no image loading, so `loadImage` would hang forever. The `src`
 * setter defers to a microtask so the `onload`/`onerror` handlers assigned by
 * `loadImage` right after `src = ...` are already in place.
 */
function stubImageClass(options: StubImageOptions): void {
  class StubImage {
    public width = options.width;
    public height = options.height;
    public onload: (() => void) | null = null;
    public onerror: (() => void) | null = null;
    public set src(_value: string) {
      queueMicrotask(() => {
        if (options.fail) {
          this.onerror?.();
          return;
        }
        this.onload?.();
      });
    }
  }
  vi.stubGlobal("Image", StubImage);
}

/** Shared mock context object (same instance used inside the element). */
function getMockContext2D(): MockContext2D {
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d") as unknown as MockContext2D;
}

/** Captures the internal canvas created by `getCroppedImageDataUrl`. */
function trackCreatedCanvases(): () => HTMLCanvasElement {
  const spy = vi.spyOn(document, "createElement");
  return () => {
    const values: unknown[] = spy.mock.results.map((result) => result.value);
    const canvases = values.filter(
      (value): value is HTMLCanvasElement => value instanceof HTMLCanvasElement,
    );
    return canvases[canvases.length - 1];
  };
}

function cropBox(element: ImageElement, box = CROP_BOX): void {
  const croppingBox = element.getCroppingBox();
  croppingBox.left = box.left;
  croppingBox.top = box.top;
  croppingBox.right = box.right;
  croppingBox.bottom = box.bottom;
}

describe("ImageElement - aplicar recorte (plano §4, §5)", () => {
  let element: ImageElement;
  let context: MockContext2D;

  beforeEach(() => {
    element = new ImageElement(ELEMENT_POSITION, IMAGE_SIZE, 1);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      STUB_DATA_URL,
    );
    context = getMockContext2D();
    context.drawImage.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function loadElementImage(): Promise<void> {
    stubImageClass({
      width: IMAGE_SIZE.width,
      height: IMAGE_SIZE.height,
      fail: false,
    });
    await element.loadImage(SOURCE_DATA_URL);
    cropBox(element);
  }

  describe("getCropRegion()", () => {
    it("computes width, height and the local center offset of the cropping box", () => {
      cropBox(element);

      expect(element.getCropRegion()).toEqual({
        width: EXPECTED_REGION_WIDTH,
        height: EXPECTED_REGION_HEIGHT,
        centerOffset: EXPECTED_CENTER_OFFSET,
      });
    });

    it("returns the full element size and a zero offset when the box is untouched", () => {
      expect(element.getCroppingBox().isCropped()).toBe(false);

      expect(element.getCropRegion()).toEqual({
        width: IMAGE_SIZE.width,
        height: IMAGE_SIZE.height,
        centerOffset: { x: 0, y: 0 },
      });
    });

    it("stays in local units when the element is rotated and scaled", () => {
      cropBox(element);
      element.rotation = 45;
      element.scale = { x: 2, y: 3 };

      expect(element.getCropRegion()).toEqual({
        width: EXPECTED_REGION_WIDTH,
        height: EXPECTED_REGION_HEIGHT,
        centerOffset: EXPECTED_CENTER_OFFSET,
      });
    });
  });

  describe("getCroppedImageDataUrl()", () => {
    it("draws the region on a canvas sized to it and returns its data URL", async () => {
      await loadElementImage();
      const takeCanvas = trackCreatedCanvases();

      const dataUrl = element.getCroppedImageDataUrl(true);

      const canvas = takeCanvas();
      expect(canvas.width).toBe(EXPECTED_REGION_WIDTH);
      expect(canvas.height).toBe(EXPECTED_REGION_HEIGHT);
      expect(context.drawImage).toHaveBeenCalledWith(
        element.image,
        CROP_BOX.left,
        CROP_BOX.top,
        EXPECTED_REGION_WIDTH,
        EXPECTED_REGION_HEIGHT,
        0,
        0,
        EXPECTED_REGION_WIDTH,
        EXPECTED_REGION_HEIGHT,
      );
      expect(dataUrl).toBe(STUB_DATA_URL);
    });

    it("enables high smoothing when smoothingEnabled is true", async () => {
      await loadElementImage();

      element.getCroppedImageDataUrl(true);

      expect(context.imageSmoothingEnabled).toBe(true);
      expect(context.imageSmoothingQuality).toBe("high");
    });

    it("disables smoothing and uses low quality when smoothingEnabled is false", async () => {
      await loadElementImage();

      element.getCroppedImageDataUrl(false);

      expect(context.imageSmoothingEnabled).toBe(false);
      expect(context.imageSmoothingQuality).toBe("low");
    });

    it("returns an empty string when an image exists but never finished loading", () => {
      element.image = {
        width: IMAGE_SIZE.width,
        height: IMAGE_SIZE.height,
      } as unknown as HTMLImageElement;

      expect(element.getCroppedImageDataUrl(true)).toBe("");
      expect(context.drawImage).not.toHaveBeenCalled();
    });
  });

  describe("loadImage()", () => {
    it("resolves on error instead of hanging and keeps the element not loaded", async () => {
      stubImageClass({ width: 0, height: 0, fail: true });

      await expect(element.loadImage(SOURCE_DATA_URL)).resolves.toBeUndefined();

      expect(element.getCroppedImageDataUrl(true)).toBe("");
      expect(context.drawImage).not.toHaveBeenCalled();
    }, 2000);

    it("adopts the image size and resets the cropping box on success", async () => {
      cropBox(element);
      expect(element.getCroppingBox().isCropped()).toBe(true);
      stubImageClass({ width: 640, height: 360, fail: false });

      await element.loadImage(SOURCE_DATA_URL);

      expect(element.size).toEqual({ width: 640, height: 360 });
      expect(element.getCroppingBox().isCropped()).toBe(false);
    });
  });
});
