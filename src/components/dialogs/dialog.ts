import type { Position } from "../types";

interface IDialogOptions {
  id: string;
  isDraggable?: boolean;
  style?: {
    minWidth?: string;
  };
  title: string;
}

export abstract class Dialog {
  private dialogEl: HTMLDialogElement | null = null;
  private headerEl: HTMLHeadingElement | null = null;
  protected dialogContent: HTMLDivElement | null = null;
  protected dialogActions: HTMLMenuElement | null = null;
  private isDragging = false;
  private dragOffset: Position = { x: 0, y: 0 };

  constructor(options: IDialogOptions) {
    this.createDOMElements(options);
    if (options.isDraggable) this.enableDrag();
  }

  public createDOMElements(options: IDialogOptions): void {
    this.dialogEl = document.createElement("dialog");
    this.dialogEl.id = `dialog-${options.id}`;
    this.dialogEl.className = "dialog-common";
    this.dialogEl.style.position = "fixed";
    this.dialogEl.style.minWidth = options?.style?.minWidth || "fit-content";
    if (!options.isDraggable) this.dialogEl.classList.add("fixed-dialog");
    this.resetPosition();

    this.dialogEl.innerHTML = `
    <form method="dialog">
      <h3 id="dialog-${options.id}-header" style="cursor: ${options.isDraggable ? "move" : "default"};">${options.title}</h3>
      <div id="dialog-${options.id}-content" class="container g-05 ai-fs"></div>
      <menu id="dialog-${options.id}-actions" class="container g-05 ai-fs"></menu>
    </form>
    `;
    document.body.appendChild(this.dialogEl);

    this.headerEl = this.dialogEl?.querySelector<HTMLHeadingElement>(
      `#dialog-${options.id}-header`,
    );
    this.dialogContent = this.dialogEl?.querySelector<HTMLDivElement>(
      `#dialog-${options.id}-content`,
    );
    this.dialogActions = this.dialogEl?.querySelector<HTMLMenuElement>(
      `#dialog-${options.id}-actions`,
    );
    if (this.dialogContent && this.dialogActions) {
      this.appendDialogContent(this.dialogContent);
      this.appendDialogActions(this.dialogActions);
    }

    this.dialogEl.addEventListener("close", () => {
      this.onClose();
    });
  }

  private enableDrag(): void {
    if (!this.headerEl) return;
    this.headerEl.addEventListener("mousedown", (event: MouseEvent) => {
      event.preventDefault();
      if (!this.dialogEl) return;

      const rect = this.dialogEl.getBoundingClientRect();
      this.dialogEl.style.transform = "";
      this.dialogEl.style.left = `${rect.left}px`;
      this.dialogEl.style.top = `${rect.top}px`;

      this.dragOffset.x = event.clientX - rect.left;
      this.dragOffset.y = event.clientY - rect.top;
      this.isDragging = true;

      window.addEventListener("mousemove", this.onMouseMove);
      window.addEventListener("mouseup", this.onMouseUp);
    });
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging || !this.dialogEl) return;
    const x = event.clientX - this.dragOffset.x;
    const y = event.clientY - this.dragOffset.y;
    this.dialogEl.style.left = `${x}px`;
    this.dialogEl.style.top = `${y}px`;
  };

  private onMouseUp = (): void => {
    if (!this.isDragging) return;
    this.isDragging = false;
    window.removeEventListener("mousemove", this.onMouseMove.bind(this));
    window.removeEventListener("mouseup", this.onMouseUp.bind(this));
  };

  private resetPosition(): void {
    if (this.dialogEl) {
      this.dialogEl.style.top = "50%";
      this.dialogEl.style.left = "50%";
      this.dialogEl.style.transform = "translate(-50%, -50%)";
    }
  }

  public open(): void {
    this.onOpen();
    this.resetPosition();
    this.dialogEl?.showModal();
  }

  public close(): void {
    this.dialogEl?.close();
  }

  protected abstract appendDialogContent(container: HTMLDivElement): void;
  protected abstract appendDialogActions(menu: HTMLMenuElement): void;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onOpen(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onClose(): void {}
}
