import type { EventBus } from "src/utils/eventBus";
import { Dialog } from "./dialog";
import type { ICheckboxControl } from "../helpers/createCheckboxControl";
import createCheckboxControl from "../helpers/createCheckboxControl";

export class DialogApplyCrop extends Dialog {
  private eventBus: EventBus;
  private keepOriginalControl: ICheckboxControl | null = null;
  private smoothingControl: ICheckboxControl | null = null;
  private keepOriginal = false;
  private smoothingEnabled = true;
  private layerId: number | null = null;

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
    const messageContainer = document.createElement("div");
    messageContainer.innerHTML =
      "<p>Deseja realmente recortar a imagem?</p><p>Esta ação não pode ser desfeita.</p>";
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "container column";
    this.keepOriginalControl = createCheckboxControl(
      "keep-original",
      "Manter o elemento original",
      {
        value: this.keepOriginal,
        tooltip:
          "Mantém o elemento original com o recorte após criar o novo elemento",
      },
      (newValue) => {
        this.keepOriginal = newValue;
      },
    );
    this.smoothingControl = createCheckboxControl(
      "smoothing",
      "Suavizar imagem do elemento recortado",
      {
        value: this.smoothingEnabled,
        tooltip:
          "Ao recortar um elemento que foi escalonado ou rotacionado, aplica uma suavização nos pixels resultantes",
      },
      (newValue) => {
        this.smoothingEnabled = newValue;
      },
    );
    this.keepOriginalControl.linkEvents();
    this.smoothingControl.linkEvents();
    optionsContainer.append(
      this.keepOriginalControl.element,
      this.smoothingControl.element,
    );
    container.append(messageContainer, optionsContainer);
  }

  protected appendDialogActions(menu: HTMLMenuElement): void {
    const btnAccept = document.createElement("button");
    btnAccept.className = "btn-common-wide";
    btnAccept.textContent = "OK";
    btnAccept.type = "button";
    btnAccept.addEventListener("click", () => {
      if (this.layerId !== null) {
        this.eventBus.emit("layer:applyCrop", {
          layerId: this.layerId,
          keepOriginal: this.keepOriginal,
          smoothingEnabled: this.smoothingEnabled,
        });
        this.eventBus.emit("alert:add", {
          message: "Elemento recortado com sucesso.",
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

  protected onOpen(): void {
    this.keepOriginal = false;
    this.smoothingEnabled = true;
    this.keepOriginalControl?.updateValue(this.keepOriginal);
    this.smoothingControl?.updateValue(this.smoothingEnabled);
  }

  protected onClose(): void {
    this.layerId = null;
  }
}
