import type { EventBus } from "src/utils/eventBus";
import { Dialog } from "./dialog";

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  );
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
      const formatSelector =
        this.dialogContent.querySelector<HTMLSelectElement>(
          "#slc_export-format",
        );
      const qualitySlider = this.dialogContent.querySelector<HTMLInputElement>(
        "#inp_image-quality-range",
      );
      const pngTransparencyCheckbox =
        this.dialogContent.querySelector<HTMLInputElement>(
          "#chk_image-transparency",
        );
      const imageSize =
        this.dialogContent?.querySelector<HTMLElement>("#str_image-size");

      if (
        formatSelector &&
        qualitySlider &&
        imageSize &&
        pngTransparencyCheckbox
      ) {
        const format = formatSelector.value;
        const quality = qualitySlider.value;
        const transparent = pngTransparencyCheckbox.checked;
        const [canvasBlobPromise] = this.eventBus.request(
          "workarea:canvas:getBlob",
          { format, quality, transparent },
        );
        if (canvasBlobPromise) {
          const canvasBlob = await canvasBlobPromise;
          if (canvasBlob) {
            this.latestDataURL = canvasBlob.dataURL;
            imageSize.textContent = formatBytes(canvasBlob.blob.size);
          } else {
            this.latestDataURL = null;
            imageSize.textContent = "-- KB";
            console.error("Failed to get canvas blob.");
          }
        } else {
          this.latestDataURL = null;
          imageSize.textContent = "-- KB";
          console.error("No promise returned for canvas blob request.");
        }
      }
    }
  };

  protected appendDialogContent(container: HTMLDivElement): void {
    container.className = "container column jc-c g-05";
    container.innerHTML = `
    <div class="container g-05 jc-sb" id="div_export-format-container">
      <p>Selecione o formato de exportação:</p>
      <select id="slc_export-format" class="input-common">
        <option value="jpeg">.JPG</option>
        <option value="png">.PNG</option>
        <option value="webp">.WEBP</option>
      </select>
    </div>
    <div id="div_transparency-container" class="container g-05 jc-sb">
      <p>Fundo transparente:</p>
      <input type="checkbox" id="chk_image-transparency" class="input-common">
    </div>
    <div id="div_image-quality-container" class="container g-05 jc-sb">
      <p>Qualidade da Imagem:</p>
      <input type="range" id="inp_image-quality-range" class="input-common" min="20" max="100" value="100" step="1">
      <label for="inp_image-quality-range" id="lbl_output-quality">100</label>
    </div>
    <br />
    <div class="container g-05 jc-sb">
      <p>Tamanho aproximado da imagem:</p>
      <strong id="str_image-size">--KB</strong>
    </div>
`;

    const exportFormatSelector = container.querySelector<HTMLSelectElement>(
      "#slc_export-format",
    );
    const imageTransparencyContainer = container.querySelector<HTMLDivElement>(
      "#div_transparency-container",
    );
    const imageTransparencyCheckbox = container.querySelector<HTMLInputElement>(
      "#chk_image-transparency",
    );
    const imageQualityRange = container.querySelector<HTMLInputElement>(
      "#inp_image-quality-range",
    );
    const outputQuality = container.querySelector<HTMLLabelElement>(
      "#lbl_output-quality",
    );

    if (
      exportFormatSelector &&
      imageQualityRange &&
      outputQuality &&
      imageTransparencyContainer &&
      imageTransparencyCheckbox
    ) {
      const handleOptionsChange = () => {
        const isJpegSelected = exportFormatSelector.value === "jpeg";
        imageTransparencyContainer.style.visibility = isJpegSelected
          ? "hidden"
          : "visible";
        outputQuality.textContent = imageQualityRange.value;
        this.updateEstimatedSize();
      };
      handleOptionsChange();
      exportFormatSelector.addEventListener("change", handleOptionsChange);
      imageQualityRange.addEventListener("input", handleOptionsChange);
      imageTransparencyCheckbox.addEventListener("change", handleOptionsChange);
    }
  }

  protected appendDialogActions(menu: HTMLMenuElement): void {
    menu.innerHTML = `
<button id="btn_confirm-export-image" class="btn-common-wide">Exportar</button>
<button id="btn_close-export-image-dialog" class="btn-common-wide">Cancelar</button>
`;
    const exportButton = menu.querySelector<HTMLButtonElement>(
      "#btn_confirm-export-image",
    );
    const closeButton = menu.querySelector<HTMLButtonElement>(
      "#btn_close-export-image-dialog",
    );

    if (exportButton && closeButton) {
      exportButton.addEventListener("click", () => {
        if (this.dialogContent && this.latestDataURL) {
          const exportFormatSelector = this.dialogContent.querySelector(
            "#slc_export-format",
          ) as HTMLSelectElement;
          const format = exportFormatSelector.value;
          window.api.exportCanvas(format, this.latestDataURL);
        }
        this.close();
      });
      closeButton.addEventListener("click", () => this.close());
    }
  }
}
