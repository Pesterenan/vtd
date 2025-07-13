import type { EventBus } from "src/utils/eventBus";
import type { Tool } from "./abstractTool";

export type ToolEventHandler = "onMouseDown" | "onMouseMove" | "onMouseUp" | "onKeyDown" | "onKeyUp";

export class ToolManager {
  private current: Tool | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    private eventBus: EventBus,
  ) {
    canvas.addEventListener("mousedown", (e) =>
      this.delegate("onMouseDown", e),
    );
    canvas.addEventListener("mousemove", (e) =>
      this.delegate("onMouseMove", e),
    );
    canvas.addEventListener("mouseup", (e) => this.delegate("onMouseUp", e));
    window.addEventListener("keydown", (e) => this.delegate("onKeyDown", e));
    window.addEventListener("keyup", (e) => this.delegate("onKeyUp", e));
  }

  public use(tool: Tool) {
    if (this.current) this.current.unequip();
    this.current = tool;
    this.current.equip();
  }

  private delegate(method: ToolEventHandler, evt: MouseEvent | KeyboardEvent) {
    if (!this.current) return;
    const handler = this.current[method] as (e: typeof evt) => void;
    handler.call(this.current, evt);
    this.eventBus.emit("tool:event", {
      tool: this.current,
      type: method,
      event: evt,
    });
  }

  public draw() {
    if (this.current) this.current.draw()
  }
}
