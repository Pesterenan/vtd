console.log('arquivo index do vfe');
window.api.onVideoMetadata((metadata) => {
  console.log('Video Metadata:', metadata);
  const videoRatio = metadata.width / metadata.height;

  // Configurando o canvas com as dimensões corretas
  const canvas = document.getElementById('video-canvas') as HTMLCanvasElement;
  canvas.width = metadata.width;
  canvas.height = metadata.height;
  canvas.setAttribute('style', 'background-color: grey;');

  const slider = document.getElementById('slider') as HTMLInputElement;
  slider.max = metadata.duration.toString();
  slider.oninput = (): void => {
    window.api.processVideoFrame(metadata.filePath, slider.value);
    console.log(slider.value);
  };

  // Aqui você pode continuar com a lógica de exibir os frames do vídeo
});
window.api.onProcessVideoFrameResponse((event, response) => {
  console.log(response, 'response from video frame extractor');
  if (response.success) {
    const videoCanvas = document.getElementById('video-canvas') as HTMLCanvasElement;
    const videoCanvasCtx = videoCanvas.getContext('2d');
    const uint8Array = new Uint8ClampedArray(response.data);

    const imageData = new ImageData(uint8Array, videoCanvas.width, videoCanvas.height);

    videoCanvasCtx?.putImageData(imageData, 0, 0);
    //const reader = new FileReader();
    //reader.onloadend = function (): void {
    //  const dataURL = reader.result as string;
    //  workArea.addImageElement(dataURL);
    //};
    //reader.readAsDataURL(blob);
  } else {
    console.error(response.message);
  }
});
