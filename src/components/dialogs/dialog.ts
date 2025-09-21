import type { Position } from "../types";

interface IDialogOptions {
  id: string;
  title: string;
  isDraggable?: boolean;
  style?: { minWidth?: string };
}

export abstract class Dialog {
  private dialogEl: HTMLDialogElement;
  private headerEl: HTMLHeadingElement | null;
  protected dialogContent: HTMLDivElement | null;
  protected dialogActions: HTMLMenuElement | null;
  private isDragging = false;
  private dragOffset: Position = { x: 0, y: 0 };

  constructor(options: IDialogOptions) {
    this.dialogEl = this.createDialogElement(options);
    document.body.appendChild(this.dialogEl);

    this.headerEl = this.dialogEl.querySelector(`#dialog-${options.id}-header`);
    this.dialogContent = this.dialogEl.querySelector(
      `#dialog-${options.id}-content`,
    );
    this.dialogActions = this.dialogEl.querySelector(
      `#dialog-${options.id}-actions`,
    );

    if (options.isDraggable) this.enableDrag();
    this.dialogEl.addEventListener("close", () => this.onClose());
  }

  private createDialogElement(options: IDialogOptions): HTMLDialogElement {
    const dialog = document.createElement("dialog");
    dialog.id = `dialog-${options.id}`;
    dialog.className = "dialog-common";
    dialog.style.position = "fixed";
    dialog.style.minWidth = options.style?.minWidth ?? "fit-content";
    if (!options.isDraggable) dialog.classList.add("fixed-dialog");
    this.setCenteredPosition(dialog);

    dialog.innerHTML = `
      <form method="dialog">
        <h3 id="dialog-${options.id}-header" style="cursor:${options.isDraggable ? "move" : "default"};">
          ${options.title}
        </h3>
        <div id="dialog-${options.id}-content" class="container g-05 ai-fs"></div>
        <menu id="dialog-${options.id}-actions" class="container g-05 ai-fs"></menu>
      </form>
    `;
    return dialog;
  }

  private enableDrag(): void {
    if (!this.headerEl) return;

    this.headerEl.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const rect = this.dialogEl.getBoundingClientRect();

      this.dialogEl.style.transform = "";
      this.dialogEl.style.left = `${rect.left}px`;
      this.dialogEl.style.top = `${rect.top}px`;

      this.dragOffset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      this.isDragging = true;

      window.addEventListener("mousemove", this.onMouseMove);
      window.addEventListener("mouseup", this.onMouseUp);
    });
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;
    const x = event.clientX - this.dragOffset.x;
    const y = event.clientY - this.dragOffset.y;
    Object.assign(this.dialogEl.style, { left: `${x}px`, top: `${y}px` });
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mouseup", this.onMouseUp);
  };

  private setCenteredPosition(dialog: HTMLDialogElement): void {
    Object.assign(dialog.style, {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    });
  }

  public open(): void {
    if (this.dialogContent && this.dialogActions && !this.dialogContent.hasChildNodes()) {
      this.appendDialogContent(this.dialogContent);
      this.appendDialogActions(this.dialogActions);
    }
    this.onOpen();
    this.setCenteredPosition(this.dialogEl);
    this.dialogEl.showModal();
  }

  public close(): void {
    this.dialogEl.close();
  }

  protected abstract appendDialogContent(container: HTMLDivElement): void;
  protected abstract appendDialogActions(menu: HTMLMenuElement): void;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onOpen(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onClose(): void {}
}
