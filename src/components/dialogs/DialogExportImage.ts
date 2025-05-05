import EVENT from "src/utils/customEvents";
import { WorkArea } from "../workArea";
import { Dialog } from "./dialog";

export class DialogExportImage extends Dialog {
  constructor() {
    super({ id: "export-image", title: "Exportar Imagem", style: { minWidth: "25rem" } });
    window.addEventListener(EVENT.OPEN_EXPORT_IMAGE_DIALOG, () =>
      this.open(),
    );
  }

  protected appendDialogContent(container: HTMLDivElement): void {
    container.classList.add("column");
    container.innerHTML = `
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
`;

    const exportFormatSelector = container.querySelector<HTMLSelectElement>("#select_export-format");
    const jpegQualityContainer = container.querySelector<HTMLDivElement>("#jpeg_quality_container");
    const jpegRangeQuality = container.querySelector<HTMLInputElement>("#jpeg_range_quality");
    const outputQuality = container.querySelector<HTMLLabelElement>("#output_quality");

    if (exportFormatSelector && jpegQualityContainer && jpegRangeQuality && outputQuality) {
      exportFormatSelector.addEventListener("change", () => {
        jpegQualityContainer.style.visibility =
          exportFormatSelector.value !== "png" ? "visible" : "hidden";
      });

      jpegRangeQuality.addEventListener("input", () => {
        outputQuality.textContent = jpegRangeQuality.value;
      });
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
        if (this.dialogContent) {
          const exportFormatSelector = this.dialogContent.querySelector(
            "#select_export-format",
          ) as HTMLSelectElement;
          const jpegRangeQuality = this.dialogContent.querySelector<HTMLInputElement>("#jpeg_range_quality");
          const format = exportFormatSelector.value;
          const quality = jpegRangeQuality?.value || '100';
          window.api.exportCanvas(
            format,
            WorkArea.getInstance().exportCanvas(format, quality),
          );
        }
        this.close();
      });

      closeButton.addEventListener("click", () => this.close());
      menu.appendChild(exportButton);
      menu.appendChild(closeButton);
    }
  }
}
