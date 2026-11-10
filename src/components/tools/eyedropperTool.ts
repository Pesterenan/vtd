import { Tool } from "./abstractTool";
import type { Position } from "../types";
import type { Element } from "../elements/element";
import { ElementGroup } from "../elements/elementGroup";
import { PathElement } from "../elements/pathElement";
import { TextElement } from "../elements/textElement";
import eyedropperIconSvg from "src/assets/icons/eyedropper-tool.svg?raw";
import { drawCursorIcon, svgToCanvasPath } from "src/utils/icons";

const TOOL_HINT =
  "Selecione o path ou texto de destino e clique no elemento de origem das cores";

type ColorableElement = PathElement | TextElement;

const isColorable = (
  element: Element | null | undefined,
): element is ColorableElement =>
  element instanceof PathElement || element instanceof TextElement;

/** Mantém a ordem de desenho: filhos de um grupo ficam entre o grupo e o próximo elemento. */
const flattenVisible = (elements: Element[]): Element[] => {
  const flat: Element[] = [];
  for (const element of elements) {
    if (!element.isVisible || element.isLocked) continue;
    if (element instanceof ElementGroup) {
      flat.push(...flattenVisible(element.children));
      continue;
    }
    flat.push(element);
  }
  return flat;
};

export class EyedropperTool extends Tool {
  private static eyedropperIcon: Path2D | null = null;
  private hoveredElement: ColorableElement | null = null;

  private static getEyedropperIcon(): Path2D | null {
    if (!this.eyedropperIcon) {
      this.eyedropperIcon = svgToCanvasPath(eyedropperIconSvg);
    }
    return this.eyedropperIcon;
  }

  public equip(): void {
    super.equip();
    this.hoveredElement = null;
    this.canvas.style.cursor = "none";
    this.eventBus.emit("tool:hint", { hintText: TOOL_HINT });
  }

  public unequip(): void {
    this.hoveredElement = null;
    this.canvas.style.cursor = "";
    this.eventBus.emit("tool:hint", { hintText: "" });
    super.unequip();
  }

  public draw(): void {
    const ctx = this.context;
    const mousePos = this.mousePos;
    const icon = EyedropperTool.getEyedropperIcon();
    if (!ctx || !mousePos || !icon) return;

    drawCursorIcon(ctx, icon, mousePos, {
      fill: this.hoveredElement ? "lightblue" : "grey",
    });
  }

  protected handleMouseMove(): void {
    const element = this.getElementAt(this.canvasPos);
    this.hoveredElement = isColorable(element) ? element : null;
  }

  protected handleMouseDown(evt: MouseEvent): void {
    evt.preventDefault();

    const source = this.getElementAt(this.canvasPos);
    if (!isColorable(source)) return;

    const targets = this.getSelectedColorables().filter(
      (target) => target.elementId !== source.elementId,
    );
    if (targets.length === 0) return;

    this.hoveredElement = source;
    this.copyColors(source, targets);
    this.eventBus.emit("element:color:changed", {
      elementIds: targets.map((target) => target.elementId),
      slot: "fill",
      value: source.fillColor,
    });
    this.eventBus.emit("element:color:changed", {
      elementIds: targets.map((target) => target.elementId),
      slot: "stroke",
      value: source.strokeColor,
    });
    this.eventBus.emit("workarea:update");
  }

  private copyColors(
    source: ColorableElement,
    targets: ColorableElement[],
  ): void {
    const fillColor = source.fillColor;
    const strokeColor = source.strokeColor;
    for (const target of targets) {
      target.fillColor = fillColor;
      target.strokeColor = strokeColor;
    }
  }

  private getSelectedColorables(): ColorableElement[] {
    const selected = this.eventBus.request("workarea:selected:get")[0] ?? [];
    return selected.filter(isColorable);
  }

  private getElementAt(position: Position | null): Element | null {
    if (!position) return null;
    const elements = flattenVisible(
      this.eventBus.request("workarea:elements:get")[0] ?? [],
    );
    for (let index = elements.length - 1; index >= 0; index--) {
      const element = elements[index];
      if (element.getBoundingBox().isPointInside(position)) return element;
    }
    return null;
  }
}
