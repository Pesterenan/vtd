import errorElement from "src/components/elements/errorElement";
import type { EventBus, SelectionChangedPayload } from "src/utils/eventBus";
import type { ISliderControl } from "./helpers/createSliderControl";
import createSliderControl from "./helpers/createSliderControl";
import type { Position, Size } from "./types";
import type { CroppingBox } from "src/utils/croppingBox";

export class TransformMenu {
  private static instance: TransformMenu | null = null;
  private transformSection: HTMLElement | null = null;
  private xPosControl: ISliderControl | null = null;
  private yPosControl: ISliderControl | null = null;
  private widthControl: ISliderControl | null = null;
  private heightControl: ISliderControl | null = null;
  private rotationControl: ISliderControl | null = null;
  private opacityControl: ISliderControl | null = null;
  private cropAccordion: HTMLDetailsElement | null = null;
  private cropTopControl: ISliderControl | null = null;
  private cropLeftControl: ISliderControl | null = null;
  private cropRightControl: ISliderControl | null = null;
  private cropBottomControl: ISliderControl | null = null;

  private constructor(private eventBus: EventBus) {
    this.createDOMElements();
    this.unlinkDOMElements();
    this.eventBus.on("selection:changed", this.handleSelectElement);
    this.eventBus.on("workarea:deleteElement", () => {
      this.unlinkDOMElements();
    });
    this.eventBus.on(
      "transformBox:properties:change",
      this.handleRecalculateTransformBox.bind(this),
    );
    this.eventBus.on(
      "transformBox:cropping:changed",
      this.handleCroppingChanged,
    );
    this.eventBus.on("workarea:initialized", () => {
      this.transformSection?.removeAttribute("disabled");
    });
    this.eventBus.on("workarea:clear", () => {
      this.transformSection?.setAttribute("disabled", "true");
    });
  }

  private handleSelectElement = ({ selectedElements }: SelectionChangedPayload): void => {
    if (selectedElements.length) {
      this.linkDOMElements();
    } else {
      this.unlinkDOMElements();
    }
  };

  private handleRecalculateTransformBox(payload: {
    position: Position;
    size: Size;
    rotation: number;
    opacity: number;
  }): void {
    const { position, size, rotation, opacity } = payload;
    if (
      this.xPosControl &&
      this.yPosControl &&
      this.widthControl &&
      this.heightControl &&
      this.rotationControl &&
      this.opacityControl
    ) {
      this.xPosControl.updateValues(position.x);
      this.yPosControl.updateValues(position.y);
      this.widthControl.updateValues(size.width);
      this.heightControl.updateValues(size.height);
      this.rotationControl.updateValues(rotation);
      this.opacityControl.updateValues(opacity);
    }
  }

  public static getInstance(eventBus: EventBus): TransformMenu {
    if (TransformMenu.instance === null) {
      TransformMenu.instance = new TransformMenu(eventBus);
    }
    return TransformMenu.instance;
  }

  public getMenu(): HTMLElement {
    if (this.transformSection) {
      return this.transformSection;
    }
    return errorElement("Menu não instanciado");
  }

  private createDOMElements(): void {
    this.transformSection = document.createElement("section");
    this.transformSection.id = "sec_transform-box-properties";
    this.transformSection.className = "sec_menu-style";
    this.transformSection.setAttribute("disabled", "true");
    this.transformSection.innerHTML = `
      <h5 style="align-self: flex-start;">Caixa de Transformação:</h5>
      <div class="container jc-sb">
        <div id="inp_group-position" class="container column jc-sb">
          <p style="align-self: flex-start;">Posição:</p>
        </div>
        <div id="inp_group-size" class="container column jc-sb">
          <p style="align-self: flex-start;">Tamanho:</p>
        </div>
      </div>
    `;
    this.xPosControl = createSliderControl(
      "inp_x-position",
      "X",
      {
        min: -8000,
        max: 8000,
        step: 1,
        value: 0,
      },
      this.handleXPosChange,
      false,
    );
    this.yPosControl = createSliderControl(
      "inp_y-position",
      "Y",
      {
        min: -8000,
        max: 8000,
        step: 1,
        value: 0,
      },
      this.handleYPosChange,
      false,
    );
    this.widthControl = createSliderControl(
      "inp_width",
      "Largura",
      {
        min: -8000,
        max: 8000,
        step: 1,
        value: 0,
      },
      this.handleWidthChange,
      false,
    );
    this.heightControl = createSliderControl(
      "inp_height",
      "Altura",
      {
        min: -8000,
        max: 8000,
        step: 1,
        value: 0,
      },
      this.handleHeightChange,
      false,
    );
    this.rotationControl = createSliderControl(
      "inp_rotation",
      "Ângulo",
      {
        min: 0,
        max: 360,
        step: 1,
        value: 0,
      },
      this.handleRotationChange,
      false,
    );
    this.opacityControl = createSliderControl(
      "inp_opacity",
      "Opacidade",
      {
        min: 0,
        max: 1,
        step: 0.05,
        value: 1,
      },
      this.handleOpacityChange,
      false,
    );
    this.transformSection
      .querySelector("#inp_group-position")
      ?.append(this.xPosControl.element, this.yPosControl.element);
    this.transformSection
      .querySelector("#inp_group-size")
      ?.append(this.widthControl.element, this.heightControl.element);
    this.transformSection.append(this.rotationControl.element);
    this.transformSection.append(this.opacityControl.element);
    this.cropAccordion = document.createElement("details");
    this.cropAccordion.innerHTML = `<summary>Recorte</summary>`;
    this.cropTopControl = createSliderControl(
      "inp_crop-top",
      "Cima",
      { min: 0, max: 100, step: 1, value: 0 },
      this.handleCropTopChange,
      false,
    );
    this.cropLeftControl = createSliderControl(
      "inp_crop-left",
      "Esquerda",
      { min: 0, max: 100, step: 1, value: 0 },
      this.handleCropLeftChange,
      false,
    );
    this.cropRightControl = createSliderControl(
      "inp_crop-right",
      "Direita",
      { min: 0, max: 100, step: 1, value: 0 },
      this.handleCropRightChange,
      false,
    );
    this.cropBottomControl = createSliderControl(
      "inp_crop-bottom",
      "Baixo",
      { min: 0, max: 100, step: 1, value: 0 },
      this.handleCropBottomChange,
      false,
    );
    this.cropAccordion.append(this.cropTopControl.element);
    this.cropAccordion.append(this.cropLeftControl.element);
    this.cropAccordion.append(this.cropRightControl.element);
    this.cropAccordion.append(this.cropBottomControl.element);
    this.transformSection.append(this.cropAccordion);
  }

  private handleXPosChange = (newValue: number): void => {
    const [properties] = this.eventBus.request("transformBox:properties:get");
    this.eventBus.emit("transformBox:updatePosition", {
      position: { x: newValue, y: properties.position.y },
    });
  };

  private handleYPosChange = (newValue: number): void => {
    const [properties] = this.eventBus.request("transformBox:properties:get");
    this.eventBus.emit("transformBox:updatePosition", {
      position: { x: properties.position.x, y: newValue },
    });
  };

  private handleWidthChange = (newValue: number): void => {
    const [properties] = this.eventBus.request("transformBox:properties:get");
    if (newValue > 0) {
      const newWidth = newValue / properties.size.width;
      this.eventBus.emit("transformBox:updateScale", {
        delta: {
          x: newWidth,
          y: 1.0,
        },
      });
    }
  };

  private handleHeightChange = (newValue: number): void => {
    const [properties] = this.eventBus.request("transformBox:properties:get");
    if (newValue > 0) {
      const newHeight = newValue / properties.size.height;
      this.eventBus.emit("transformBox:updateScale", {
        delta: {
          x: 1.0,
          y: newHeight,
        },
      });
    }
  };

  private handleRotationChange = (newValue: number): void => {
    this.eventBus.emit("transformBox:updateRotation", { delta: newValue });
  };

  private handleOpacityChange = (newValue: number): void => {
    this.eventBus.emit("transformBox:updateOpacity", { delta: newValue });
  };

  private handleCropTopChange = (newValue: number): void => {
    this.eventBus.emit("transformMenu:cropping:update", {
      property: "top",
      value: newValue,
    });
  };

  private handleCropLeftChange = (newValue: number): void => {
    this.eventBus.emit("transformMenu:cropping:update", {
      property: "left",
      value: newValue,
    });
  };

  private handleCropRightChange = (newValue: number): void => {
    this.eventBus.emit("transformMenu:cropping:update", {
      property: "right",
      value: newValue,
    });
  };

  private handleCropBottomChange = (newValue: number): void => {
    this.eventBus.emit("transformMenu:cropping:update", {
      property: "bottom",
      value: newValue,
    });
  };

  private handleCroppingChanged = (croppingBox: CroppingBox): void => {
    if (croppingBox) {
      this.cropTopControl?.updateValues(croppingBox.top);
      this.cropLeftControl?.updateValues(croppingBox.left);
      this.cropRightControl?.updateValues(croppingBox.right);
      this.cropBottomControl?.updateValues(croppingBox.bottom);
    }
  };

  private linkDOMElements(): void {
    const [properties] = this.eventBus.request("transformBox:properties:get");
    this.xPosControl?.linkEvents();
    this.yPosControl?.linkEvents();
    this.widthControl?.linkEvents();
    this.heightControl?.linkEvents();
    this.rotationControl?.linkEvents();
    this.opacityControl?.linkEvents();
    this.xPosControl?.updateValues(properties.position.x);
    this.yPosControl?.updateValues(properties.position.y);
    this.widthControl?.updateValues(properties.size.width);
    this.heightControl?.updateValues(properties.size.height);
    this.rotationControl?.updateValues(properties.rotation);
    this.opacityControl?.updateValues(properties.opacity);

    const [croppingBox] = this.eventBus.request("transformBox:cropping:get");

    if (croppingBox && this.cropAccordion) {
      this.cropAccordion.removeAttribute("disabled");

      const sizeToUse = properties.unscaledSize || properties.size;
      this.cropTopControl?.updateOptions({ max: sizeToUse.height });
      this.cropLeftControl?.updateOptions({ max: sizeToUse.width });
      this.cropRightControl?.updateOptions({ max: sizeToUse.width });
      this.cropBottomControl?.updateOptions({ max: sizeToUse.height });

      this.cropTopControl?.linkEvents();
      this.cropLeftControl?.linkEvents();
      this.cropRightControl?.linkEvents();
      this.cropBottomControl?.linkEvents();

      this.cropTopControl?.updateValues(croppingBox.top);
      this.cropLeftControl?.updateValues(croppingBox.left);
      this.cropRightControl?.updateValues(croppingBox.right);
      this.cropBottomControl?.updateValues(croppingBox.bottom);
    } else if (this.cropAccordion) {
      this.cropAccordion.setAttribute("disabled", "true");
      this.cropAccordion.open = false;
      this.cropTopControl?.unlinkEvents();
      this.cropLeftControl?.unlinkEvents();
      this.cropRightControl?.unlinkEvents();
      this.cropBottomControl?.unlinkEvents();
    }
  }

  private unlinkDOMElements(): void {
    this.xPosControl?.unlinkEvents();
    this.yPosControl?.unlinkEvents();
    this.widthControl?.unlinkEvents();
    this.heightControl?.unlinkEvents();
    this.rotationControl?.unlinkEvents();
    this.opacityControl?.unlinkEvents();
    this.cropTopControl?.unlinkEvents();
    this.cropLeftControl?.unlinkEvents();
    this.cropRightControl?.unlinkEvents();
    this.cropBottomControl?.unlinkEvents();
    if (this.cropAccordion) {
      this.cropAccordion.setAttribute("disabled", "true");
      this.cropAccordion.open = false;
    }
  }
}
