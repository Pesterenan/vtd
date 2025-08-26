import type { EventBus } from "src/utils/eventBus";
import { Dialog } from "./dialog";

export class DialogApplyCrop extends Dialog {
  private eventBus: EventBus;
  private keepOriginalCheckbox: HTMLInputElement | null = null;
  private layerId: number | null = null;
  private smoothingCheckbox: HTMLInputElement | null = null;

  constructor(eventBus: EventBus) {
    super({
      id: "apply-crop-dialog",
      title: "Aplicar Recorte",
      style: { minWidth: "25rem" },
    });
    this.eventBus = eventBus;
    this.eventBus.on("dialog:applyCrop:open", ({ layerId }) => {
      this.layerId = layerId;
      this.open();
    });
  }

  protected appendDialogContent(container: HTMLDivElement): void {
    container.className = "container column g-1";
    const message = document.createElement("p");
    message.textContent =
      "Deseja realmente recortar a imagem? Esta ação não pode ser desfeita.";
    const checkboxContainer = document.createElement("div");
    checkboxContainer.className = "container ai-c g-05";

    this.keepOriginalCheckbox = document.createElement("input");
    this.keepOriginalCheckbox.type = "checkbox";
    this.keepOriginalCheckbox.id = "keep-original-checkbox";
    this.keepOriginalCheckbox.checked = false;
    const keepOriginalLabel = document.createElement("label");
    keepOriginalLabel.textContent = "Manter o elemento original";
    keepOriginalLabel.htmlFor = "keep-original-checkbox";

    this.smoothingCheckbox = document.createElement("input");
    this.smoothingCheckbox.type = "checkbox";
    this.smoothingCheckbox.id = "smoothing-checkbox";
    this.smoothingCheckbox.checked = true;
    const smoothingLabel = document.createElement("label");
    smoothingLabel.textContent = "Suavizar imagem do elemento recortado";
    smoothingLabel.htmlFor = "smoothing-checkbox";

    checkboxContainer.append(this.keepOriginalCheckbox, keepOriginalLabel);
    checkboxContainer.append(this.smoothingCheckbox, smoothingLabel);
    container.append(message, checkboxContainer);
  }

  protected appendDialogActions(menu: HTMLMenuElement): void {
    const btnAccept = document.createElement("button");
    btnAccept.className = "btn-common-wide";
    btnAccept.textContent = "OK";
    btnAccept.type = "button";
    btnAccept.addEventListener("click", () => {
      this.keepOriginalCheckbox =
        this.dialogContent?.querySelector("#keep-original-checkbox") || null;
      this.smoothingCheckbox =
        this.dialogContent?.querySelector("#smoothing-checkbox") || null;
      if (
        this.layerId !== null &&
        this.keepOriginalCheckbox &&
        this.smoothingCheckbox
      ) {
        this.eventBus.emit("layer:applyCrop", {
          layerId: this.layerId,
          keepOriginal: this.keepOriginalCheckbox?.checked,
          smoothingEnabled: this.smoothingCheckbox?.checked,
        });
        this.eventBus.emit("alert:add", {
          message: 'Elemento recortado com sucesso.',
          type: "success",
        });
      }
      this.close();
    });

    const btnCancel = document.createElement("button");
    btnCancel.className = "btn-common-wide";
    btnCancel.textContent = "Cancelar";
    btnCancel.type = "button";
    btnCancel.addEventListener("click", () => {
      this.close();
    });
    menu.appendChild(btnAccept);
    menu.appendChild(btnCancel);
  }

  protected onClose(): void {
    this.layerId = null;
  }
}
