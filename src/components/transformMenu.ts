import EVENT from "src/utils/customEvents";
import errorElement from "src/components/elements/errorElement";
import { WorkArea } from "src/components/workArea";
import type { ISliderControl } from "./helpers/createSliderControl";
import { createSliderControl } from "./helpers/createSliderControl";
import type { TransformBox } from "./transformBox";

export class TransformMenu {
  private static instance: TransformMenu | null = null;
  private transformSection: HTMLElement | null = null;
  private transformBox: TransformBox | null = null;
  private xPosControl: ISliderControl | null = null;
  private yPosControl: ISliderControl | null = null;
  private widthControl: ISliderControl | null = null;
  private heightControl: ISliderControl | null = null;
  private rotationControl: ISliderControl | null = null;

  private constructor() {
    this.createDOMElements();
    window.addEventListener(EVENT.SELECT_ELEMENT, () => {
      this.transformBox = WorkArea.getInstance().transformBox;
      if (this.transformBox) {
        this.linkDOMElements();
      } else {
        this.unlinkDOMElements();
      }
    });
    window.addEventListener(EVENT.RECALCULATE_TRANSFORM_BOX, (evt: Event) => {
      const customEvent = evt as CustomEvent;
      const { position, size, rotation } = customEvent.detail;
      if (
        this.xPosControl &&
        this.yPosControl &&
        this.widthControl &&
        this.heightControl &&
        this.rotationControl
      ) {
        this.xPosControl.updateValues(position.x);
        this.yPosControl.updateValues(position.y);
        this.widthControl.updateValues(size.width);
        this.heightControl.updateValues(size.height);
        this.rotationControl.updateValues(rotation);
      }
    });
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
    this.transformSection.id = "sec_gradient-menu";
    this.transformSection.className = "sec_menu-style";
    this.transformSection.innerHTML = `
      <p style="align-self: flex-start;">Caixa de Transformação:</p>
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
    this.transformSection
      .querySelector("#inp_group-position")
      ?.append(this.xPosControl.element, this.yPosControl.element);
    this.transformSection
      .querySelector("#inp_group-size")
      ?.append(this.widthControl.element, this.heightControl.element);
    this.transformSection.append(this.rotationControl.element);
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
    if (this.transformBox) {
      this.transformBox.updateScale({
        width: newValue,
        height: this.transformBox.size.height,
      });
    }
  };

  private handleHeightChange = (newValue: number): void => {
    if (this.transformBox) {
      this.transformBox.updateScale({
        width: this.transformBox.size.width,
        height: newValue,
      });
    }
  };

  private handleRotationChange = (newValue: number): void => {
    if (this.transformBox) {
      this.transformBox.updateRotation(newValue);
    }
  };

  private linkDOMElements(): void {
    if (this.transformBox) {
      this.xPosControl?.linkEvents();
      this.yPosControl?.linkEvents();
      this.widthControl?.linkEvents();
      this.heightControl?.linkEvents();
      this.rotationControl?.linkEvents();
      this.xPosControl?.updateValues(this.transformBox.position.x);
      this.yPosControl?.updateValues(this.transformBox.position.y);
      this.widthControl?.updateValues(this.transformBox.size.width);
      this.heightControl?.updateValues(this.transformBox.size.height);
    }
  }

  private unlinkDOMElements(): void {
    this.transformBox = null;
    this.xPosControl?.unlinkEvents();
    this.yPosControl?.unlinkEvents();
    this.widthControl?.unlinkEvents();
    this.heightControl?.unlinkEvents();
    this.rotationControl?.unlinkEvents();
  }
}