import EVENT from "src/utils/customEvents";
import errorElement from "src/components/elements/errorElement";
import { WorkArea } from "src/components/workArea";
import type { ISliderControl } from "./helpers/createSliderControl";
import { createSliderControl } from "./helpers/createSliderControl";
import type { TransformBox } from "./transformBox";
import type { RecalculateTransformBoxDetail } from "./types";

export class TransformMenu {
  private static instance: TransformMenu | null = null;
  private transformSection: HTMLElement | null = null;
  private transformBox: TransformBox | null = null;
  private xPosControl: ISliderControl | null = null;
  private yPosControl: ISliderControl | null = null;
  private widthControl: ISliderControl | null = null;
  private heightControl: ISliderControl | null = null;
  private rotationControl: ISliderControl | null = null;
  private opacityControl: ISliderControl | null = null;

  private constructor() {
    this.createDOMElements();
    window.addEventListener(
      EVENT.SELECT_ELEMENT,
      this.handleSelectElement.bind(this),
    );
    window.addEventListener(
      EVENT.RECALCULATE_TRANSFORM_BOX,
      this.handleRecalculateTransformBox.bind(this),
    );
  }

  private handleSelectElement(): void {
    this.transformBox = WorkArea.getInstance().transformBox;
    if (this.transformBox) {
      this.linkDOMElements();
    } else {
      this.unlinkDOMElements();
    }
  }

  private handleRecalculateTransformBox(
    evt: CustomEvent<RecalculateTransformBoxDetail>,
  ): void {
    const { position, size, rotation, opacity } = evt.detail;
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

  public static getInstance(): TransformMenu {
    if (this.instance === null) {
      this.instance = new TransformMenu();
    }
    return this.instance;
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
    this.transformSection.innerHTML = `
      <h5 style="align-self: flex-start;">Caixa de Transformação:</h5>
      <div class="container jc-sb">
        <div id="inp_group-position" class="container-column jc-sb">
          <p style="align-self: flex-start;">Posição:</p>
        </div>
        <div id="inp_group-size" class="container-column jc-sb">
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
        value: this.transformBox?.position.x || 0,
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
        value: this.transformBox?.position.y || 0,
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
        value: this.transformBox?.size.width || 10,
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
        value: this.transformBox?.size.height || 10,
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
        value: this.transformBox?.rotation || 0,
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
        value: this.transformBox?.opacity || 1,
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
  }

  private handleXPosChange = (newValue: number): void => {
    if (this.transformBox) {
      this.transformBox.updatePosition({
        x: newValue,
        y: this.transformBox.position.y,
      });
    }
  };

  private handleYPosChange = (newValue: number): void => {
    if (this.transformBox) {
      this.transformBox.updatePosition({
        x: this.transformBox.position.x,
        y: newValue,
      });
    }
  };

  private handleWidthChange = (newValue: number): void => {
    if (this.transformBox && newValue > 0) {
      const newWidth = newValue / this.transformBox.size.width;
      this.transformBox.updateScale({
        x: newWidth,
        y: 1.0,
      });
    }
  };

  private handleHeightChange = (newValue: number): void => {
    if (this.transformBox && newValue > 0) {
      const newHeight = newValue / this.transformBox.size.height;
      this.transformBox.updateScale({
        x: 1.0,
        y: newHeight,
      });
    }
  };

  private handleRotationChange = (newValue: number): void => {
    if (this.transformBox) {
      this.transformBox.updateRotation(newValue);
    }
  };

  private handleOpacityChange = (newValue: number): void => {
    if (this.transformBox) {
      this.transformBox.updateOpacity(newValue);
    }
  };

  private linkDOMElements(): void {
    if (this.transformBox) {
      this.xPosControl?.linkEvents();
      this.yPosControl?.linkEvents();
      this.widthControl?.linkEvents();
      this.heightControl?.linkEvents();
      this.rotationControl?.linkEvents();
      this.opacityControl?.linkEvents();
      this.xPosControl?.updateValues(this.transformBox.position.x);
      this.yPosControl?.updateValues(this.transformBox.position.y);
      this.widthControl?.updateValues(this.transformBox.size.width);
      this.heightControl?.updateValues(this.transformBox.size.height);
      this.rotationControl?.updateValues(this.transformBox.rotation);
      this.opacityControl?.updateValues(this.transformBox.opacity);
    }
  }

  private unlinkDOMElements(): void {
    this.transformBox = null;
    this.xPosControl?.unlinkEvents();
    this.yPosControl?.unlinkEvents();
    this.widthControl?.unlinkEvents();
    this.heightControl?.unlinkEvents();
    this.rotationControl?.unlinkEvents();
    this.opacityControl?.unlinkEvents();
  }
}
