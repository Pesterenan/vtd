import type { EventBus } from "src/utils/eventBus";
import type { Tool } from "./abstractTool";
import type { Position } from "../types";

export type ToolEventHandler =
  | "onMouseDown"
  | "onMouseMove"
  | "onMouseUp"
  | "onKeyDown"
  | "onKeyUp"
  | "onContextMenu";

export class ToolManager {
  private currentTool: Tool | null = null;
  private lastMousePos: Position | null = null;
  private isWorkAreaActive = false;

  constructor(
    canvas: HTMLCanvasElement,
    private eventBus: EventBus,
  ) {
    canvas.addEventListener("mousedown", (e) => {
      this.lastMousePos = { x: e.offsetX, y: e.offsetY };
      this.delegate("onMouseDown", e);
    });
    canvas.addEventListener("mousemove", (e) => {
      this.lastMousePos = { x: e.offsetX, y: e.offsetY };
      this.delegate("onMouseMove", e);
    });
    canvas.addEventListener("mouseup", (e) => {
      this.lastMousePos = { x: e.offsetX, y: e.offsetY };
      this.delegate("onMouseUp", e);
    });
    window.addEventListener("keydown", (e) => this.delegate("onKeyDown", e));
    window.addEventListener("keyup", (e) => this.delegate("onKeyUp", e));
    canvas.addEventListener("contextmenu", (e) => this.delegate("onContextMenu", e));

    this.eventBus.on("workarea:initialized", () => {
      this.isWorkAreaActive = true;
    });
    this.eventBus.on("workarea:clear", () => {
      this.isWorkAreaActive = false;
    });
    this.eventBus.on("mouse:position:get", () => this.lastMousePos);
  }

  public use(tool: Tool) {
    if (this.currentTool) this.currentTool.unequip();
    this.currentTool = tool;
    this.currentTool.equip();
  }

  private delegate(method: ToolEventHandler, evt: MouseEvent | KeyboardEvent) {
    if (!this.currentTool || !this.isWorkAreaActive) return;
    if (method === "onKeyDown" || method === "onKeyUp") {
      const activeEl = document.activeElement;
      if (activeEl?.tagName === "TEXTAREA" || activeEl?.tagName === "INPUT")
        return;
    }
    const handler = this.currentTool[method] as (e: typeof evt) => void;
    handler.call(this.currentTool, evt);
    this.eventBus.emit("tool:event", {
      tool: this.currentTool,
      type: method,
      event: evt,
    });
  }

  public draw() {
    if (this.currentTool) this.currentTool.draw();
  }
}
