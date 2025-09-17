import type { EventBus } from "src/utils/eventBus";
import { Dialog } from "./dialog";

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export class DialogExportImage extends Dialog {
  private eventBus: EventBus;
  private latestDataURL: string | null = null;

  constructor(eventBus: EventBus) {
    super({
      id: "export-image",
      title: "Exportar Imagem",
      style: { minWidth: "25rem" },
    });
    this.eventBus = eventBus;
    this.eventBus.on("dialog:exportImage:open", () => {
      this.open();
      this.updateEstimatedSize();
    });
  }

  private updateEstimatedSize = async () => {
    if (this.dialogContent) {
      const formatSelector = this.dialogContent.querySelector<HTMLSelectElement>("#select_export-format");
      const qualitySlider = this.dialogContent.querySelector<HTMLInputElement>("#jpeg_range_quality");
      const imageSize = this.dialogContent?.querySelector<HTMLElement>("#image_size");

      if (formatSelector && qualitySlider && imageSize) {
        const format = formatSelector.value;
        const quality = qualitySlider.value;
        const [canvasBlobPromise] = this.eventBus.request("workarea:canvas:getBlob", { format, quality });
        if (canvasBlobPromise) {
          const canvasBlob = await canvasBlobPromise;
          if (canvasBlob) {
            this.latestDataURL = canvasBlob.dataURL;
            imageSize.textContent = formatBytes(canvasBlob.blob.size);
          } else {
            this.latestDataURL = null;
            imageSize.textContent = '-- KB';
            console.error("Failed to get canvas blob.");
          }
        } else {
          this.latestDataURL = null;
          imageSize.textContent = '-- KB';
          console.error("No promise returned for canvas blob request.");
        }
      }
    }
  };

  protected appendDialogContent(container: HTMLDivElement): void {
    container.className = "container column jc-c g-05";
    container.innerHTML = `
    <div class="container g-05 jc-sb" id="export-format_container">
      <p>Selecione o formato de exportação:</p>
      <select id="select_export-format" class="input-common">
        <option value="png">.PNG</option>
        <option value="jpeg">.JPG</option>
        <option value="webp">.WEBP</option>
      </select>
    </div>
    <div id="jpeg_quality_container" class="container g-05 jc-sb" style="visibility: hidden;">
      <p>Qualidade do JPEG/WEBP:</p>
      <input type="range" id="jpeg_range_quality" class="input-common" min="25" max="100" value="100" step="5">
      <label for="jpeg_range_quality" id="output_quality">100</label>
    </div>
    <div class="container g-05 jc-sb">
      <p>Tamanho aproximado da imagem:</p>
      <strong id="image_size">--KB</strong>
    </div>
`;

    const exportFormatSelector = container.querySelector<HTMLSelectElement>("#select_export-format");
    const jpegQualityContainer = container.querySelector<HTMLDivElement>("#jpeg_quality_container");
    const jpegRangeQuality = container.querySelector<HTMLInputElement>("#jpeg_range_quality");
    const outputQuality = container.querySelector<HTMLLabelElement>("#output_quality");

    if (exportFormatSelector && jpegQualityContainer && jpegRangeQuality && outputQuality) {
      const handleOptionsChange = () => {
        jpegQualityContainer.style.visibility = exportFormatSelector.value !== "png" ? "visible" : "hidden";
        outputQuality.textContent = jpegRangeQuality.value;
        this.updateEstimatedSize();
      };
      exportFormatSelector.addEventListener("change", handleOptionsChange);
      jpegRangeQuality.addEventListener("change", handleOptionsChange);
    }
  }

  protected appendDialogActions(menu: HTMLMenuElement): void {
    menu.innerHTML = `
<button id="btn_confirm-export-image" class="btn-common-wide">Exportar</button>
<button id="btn_close-export-image-dialog" class="btn-common-wide">Cancelar</button>
`;
    const exportButton = menu.querySelector<HTMLButtonElement>("#btn_confirm-export-image");
    const closeButton = menu.querySelector<HTMLButtonElement>("#btn_close-export-image-dialog");

    if (exportButton && closeButton) {
      exportButton.addEventListener("click", () => {
        if (this.dialogContent && this.latestDataURL) {
          const exportFormatSelector = this.dialogContent.querySelector("#select_export-format") as HTMLSelectElement;
          const format = exportFormatSelector.value;
          window.api.exportCanvas(format, this.latestDataURL);
        }
        this.close();
      });
      closeButton.addEventListener("click", () => this.close());
    }
  }
}
