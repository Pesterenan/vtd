import { Tool } from "./abstractTool";
import type { Position } from "../types";
import type { Element } from "../elements/element";
import { ElementGroup } from "../elements/elementGroup";
import { PathElement } from "../elements/pathElement";
import { TextElement } from "../elements/textElement";
import eyedropperIconSvg from "src/assets/icons/eyedropper-tool.svg?raw";
import { drawCursorIcon, svgToCanvasPath } from "src/utils/icons";

const TOOL_HINT =
  "Selecione o destino e clique na origem · SHIFT: preenchimento · ALT: contorno";

/** Canal de cor que o clique copia da origem para os elementos selecionados. */
type EyedropperMode = "both" | "fill" | "stroke";

const MODE_HINTS: Record<EyedropperMode, string> = {
  both: TOOL_HINT,
  fill: "Modo preenchimento · SHIFT · clique na origem para copiar só a cor de preenchimento",
  stroke: "Modo contorno · ALT · clique na origem para copiar só a cor de contorno",
};

/** SHIFT = preenchimento, ALT = contorno; combinações caem no legado (ambos). */
const modeFrom = (shift: boolean, alt: boolean): EyedropperMode => {
  if (shift && !alt) return "fill";
  if (alt && !shift) return "stroke";
  return "both";
};

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
  private lastHint: string | null = null;

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
    this.updateHint(modeFrom(this.modifiers.shift, this.modifiers.alt));
  }

  public unequip(): void {
    this.hoveredElement = null;
    this.lastHint = null;
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
    this.drawModeBadge(ctx, mousePos, this.activeMode);
  }

  private get activeMode(): EyedropperMode {
    return modeFrom(this.modifiers.shift, this.modifiers.alt);
  }

  /** Atualiza o hint e o cursor quando o modificador muda (sem repetir o mesmo texto). */
  private updateHint(mode: EyedropperMode): void {
    const hint = MODE_HINTS[mode];
    if (hint === this.lastHint) return;
    this.lastHint = hint;
    this.eventBus.emit("tool:hint", { hintText: hint });
  }

  /** Selo "P"/"C" no cursor indicando o canal armado (some no modo padrão). */
  private drawModeBadge(
    ctx: CanvasRenderingContext2D,
    mousePos: Position,
    mode: EyedropperMode,
  ): void {
    if (mode === "both") return;
    const center = { x: mousePos.x + 10, y: mousePos.y + 10 };
    ctx.save();
    ctx.beginPath();
    ctx.arc(center.x, center.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#202020";
    ctx.stroke();
    ctx.fillStyle = "#202020";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mode === "fill" ? "P" : "C", center.x, center.y + 0.5);
    ctx.restore();
  }

  protected handleKeyDown(): void {
    this.updateHint(this.activeMode);
  }

  protected handleKeyUp(): void {
    this.updateHint(this.activeMode);
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

    const mode = modeFrom(evt.shiftKey, evt.altKey);
    if (mode === "fill") {
      if (!source.hasFill) return;
      this.copyFill(source, targets);
      this.emitColorChanged("fill", source.fillColor, targets);
    } else if (mode === "stroke") {
      if (!source.hasStroke) return;
      this.copyStroke(source, targets);
      this.emitColorChanged("stroke", source.strokeColor, targets);
    } else {
      this.copyColors(source, targets);
      this.emitColorChanged("fill", source.fillColor, targets);
      this.emitColorChanged("stroke", source.strokeColor, targets);
    }

    this.eventBus.emit("workarea:update");
  }

  private emitColorChanged(
    slot: "fill" | "stroke",
    value: string,
    targets: ColorableElement[],
  ): void {
    this.eventBus.emit("element:color:changed", {
      elementIds: targets.map((target) => target.elementId),
      slot,
      value,
    });
  }

  /** Copia cor + liga o preenchimento no destino (origem sem fill já foi filtrada). */
  private copyFill(
    source: ColorableElement,
    targets: ColorableElement[],
  ): void {
    for (const target of targets) {
      target.fillColor = source.fillColor;
      target.hasFill = true;
    }
  }

  /** Copia cor + liga o contorno no destino. */
  private copyStroke(
    source: ColorableElement,
    targets: ColorableElement[],
  ): void {
    for (const target of targets) {
      target.strokeColor = source.strokeColor;
      target.hasStroke = true;
    }
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
