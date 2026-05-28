export class LoadingOverlay {
  private overlayEl: HTMLDivElement;
  private messageEl: HTMLParagraphElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delayMs: number;

  constructor(delayMs = 100) {
    this.delayMs = delayMs;
    this.overlayEl = document.createElement("div");
    this.overlayEl.id = "loading-overlay";
    this.messageEl = document.createElement("p");
    this.messageEl.className = "loading-message";
    this.overlayEl.innerHTML = `<div class="spinner"></div>`;
    this.overlayEl.append(this.messageEl);
    document.body.appendChild(this.overlayEl);
  }

  show(message?: string): void {
    if (this.timer) return;
    this.messageEl.textContent = message ?? "";
    this.timer = setTimeout(() => {
      this.overlayEl.classList.add("active");
      this.timer = null;
    }, this.delayMs);
  }

  hide(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      return;
    }
    this.overlayEl.classList.remove("active");
  }
}
