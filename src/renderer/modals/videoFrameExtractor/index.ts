(function initializeVideoFrameExtractor(): void {
  let filePath = '';
  const extractFrameBtn = document.getElementById('btn_extract-frame') as HTMLButtonElement;

  extractFrameBtn.onclick = (): void => {
    console.log('extracting frame');
    if (offScreenCanvas) {
      const canvasContext = offScreenCanvas.getContext('2d');
      if (canvasContext) {
        const imageData = canvasContext!.getImageData(0, 0, 1920, 1080);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1920;
        tempCanvas.height = 1080;
        const tempContext = tempCanvas.getContext('2d');
        if (tempContext) {
          tempContext.putImageData(imageData, 0, 0);
          const imageUrl = tempCanvas.toDataURL('image/png');
          console.log('sending...', imageUrl.slice(0, 100));
          // @ts-ignore defined in main.ts
          window.api.sendFrameToWorkArea(imageUrl);
        }
      }
    }
  };

  const videoCanvas = document.getElementById('video-canvas') as HTMLCanvasElement;
  const videoCanvasCtx = videoCanvas.getContext('2d');
  let offScreenCanvas: OffscreenCanvas | null = null;
  let offScreenContext: OffscreenCanvasRenderingContext2D | null = null;
  let videoRatio = 1;

  // @ts-ignore defined in main.ts
  window.api.onVideoMetadata((metadata) => {
    videoRatio = metadata.height / metadata.width;
    filePath = metadata.filePath;
    console.log('VFE initialized', filePath);

    offScreenCanvas = new OffscreenCanvas(metadata.width, metadata.height);
    offScreenContext = offScreenCanvas.getContext('2d');

    const slider = document.getElementById('slider') as HTMLInputElement;
    slider.oninput = (): void => {
      const sliderValueInterpolated = (metadata.duration * Number(slider.value)) / 100;
      // @ts-ignore defined in main.ts
      window.api.processVideoFrame(filePath, sliderValueInterpolated);
      console.log(slider.value);
    };
  });

  // @ts-ignore defined in main.ts
  window.api.onProcessVideoFrameResponse((_, response) => {
    console.log(response, 'response from video frame extractor');
    if (response.success) {
      const uint8Array = new Uint8ClampedArray(response.data);

      if (offScreenCanvas && videoCanvasCtx) {
        const imageData = new ImageData(uint8Array, offScreenCanvas.width, offScreenCanvas.height);
        offScreenContext?.putImageData(imageData, 0, 0);

        videoCanvasCtx.save();
        videoCanvasCtx.drawImage(
          offScreenCanvas,
          0,
          0,
          videoCanvas.width,
          Math.ceil(videoCanvas.width * videoRatio)
        );
        videoCanvasCtx.restore();
      }
    } else {
      console.error(response.message);
    }
  });
})();
