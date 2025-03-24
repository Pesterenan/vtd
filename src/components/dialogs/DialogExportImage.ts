import EVENT from "src/utils/customEvents";
import { WorkArea } from "../workArea";

export class DialogExportImage {
  private exportImageDialog: HTMLDialogElement | null = null;

  constructor() {
    this.createDOMElements();
    this.addEventListeners();
  }

  private createDOMElements(): void {
    this.exportImageDialog = document.createElement("dialog");
    this.exportImageDialog.id = "export-image-dialog";
    this.exportImageDialog.className = "dialog-common";
    this.exportImageDialog.innerHTML = `
<form method="dialog">
  <h3 style="text-align: center; width: 100%;">Exportar Imagem</h3>
  <div class="container-column g-05 ai-fs pad-1">
    <div class="container g-05" id="export-format_container">
      <p>Selecione o formato de exportação:</p>
      <select id="select_export-format" class="input-common">
        <option value="png">.PNG</option>
        <option value="jpeg">.JPG</option>
        <option value="webp">.WEBP</option>
      </select>
    </div>
    <div id="jpeg_quality_container" class="container g-05" style="visibility: hidden;">
      <p>Qualidade do JPEG/WEBP:</p>
      <input type="range" id="jpeg_range_quality" class="input-common" min="25" max="100" value="100" step="5">
      <label for="jpeg_range_quality" id="output_quality">100</label>
    </div>
  </div>
  <menu class="container g-1 jc-sb">
    <button id="btn_confirm-export-image" class="btn-common-wide">Exportar</button>
    <button id="btn_close-export-image-dialog" class="btn-common-wide">Cancelar</button>
  </menu>
</form>
`;
    document.body.appendChild(this.exportImageDialog);

    const exportFormatSelector = this.exportImageDialog.querySelector(
      "#select_export-format",
    ) as HTMLSelectElement;

    const jpegQualityContainer = this.exportImageDialog.querySelector(
      "#jpeg_quality_container",
    ) as HTMLDivElement;

    const exportButton = this.exportImageDialog.querySelector(
      "#btn_confirm-export-image",
    ) as HTMLButtonElement;

    const closeButton = this.exportImageDialog.querySelector(
      "#btn_close-export-image-dialog",
    ) as HTMLButtonElement;

    const jpegRangeQuality = this.exportImageDialog.querySelector(
      "#jpeg_range_quality",
    ) as HTMLInputElement;

    const outputQuality = this.exportImageDialog.querySelector(
      "#output_quality",
    ) as HTMLLabelElement;

    exportFormatSelector.addEventListener("change", () => {
      jpegQualityContainer.style.visibility =
        exportFormatSelector.value !== "png" ? "visible" : "hidden";
    });

    jpegRangeQuality.addEventListener("input", () => {
      outputQuality.textContent = jpegRangeQuality.value;
    });

    exportButton.addEventListener("click", () => {
      if (this.exportImageDialog) {
        const exportFormatSelector = this.exportImageDialog.querySelector(
          "#select_export-format",
        ) as HTMLSelectElement;
        const format = exportFormatSelector.value;
        const quality = jpegRangeQuality.value;
        window.api.exportCanvas(
          format,
          WorkArea.getInstance().exportCanvas(format, quality),
        );
      }
      this.closeDialog();
    });

    closeButton.addEventListener("click", () => this.closeDialog());
  }

  private closeDialog(): void {
    if (this.exportImageDialog) {
      this.exportImageDialog.close();
    }
  }

  private openDialog(): void {
    if (this.exportImageDialog) {
      this.exportImageDialog.showModal();
    }
  }

  private addEventListeners(): void {
    window.addEventListener(EVENT.OPEN_EXPORT_IMAGE_DIALOG, () =>
      this.openDialog(),
    );
  }
}
