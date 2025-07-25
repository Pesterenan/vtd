import type { EventBus } from "src/utils/eventBus";

export interface AlertPayload {
  message: string;
  type: "success" | "error";
}

interface Alert {
  id: string;
  message: string;
  timestamp: Date;
  title?: string;
  type: AlertPayload["type"];
}

const ALERT_TITLE: Record<Alert["type"], string> = {
  success: "Sucesso",
  error: "Erro",
} as const;

export class Alerts {
  private alertQueue: Alert[];
  private alertInterval: number | null = null;
  private alertsContainer: HTMLDivElement | null = null;
  private readonly intervalMs: number = 3000;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.alertQueue = [];
    this.eventBus = eventBus;
    this.createDOMElements();
    this.addEventListeners();
  }

  private createDOMElements(): void {
    this.alertsContainer = document.createElement("div");
    this.alertsContainer.id = "alerts-container";
    document.body.appendChild(this.alertsContainer);
  }

  private addEventListeners(): void {
    this.eventBus.on("alert:add", (payload) => this.addAlert(payload));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private addAlert({ message, type }: AlertPayload): void {
    const newAlert: Alert = {
      id: this.generateId(),
      message,
      timestamp: new Date(),
      title: ALERT_TITLE[type],
      type,
    };
    this.alertQueue.push(newAlert);
    this.renderAlert(newAlert);
    if (this.alertInterval === null) {
      this.startRemovalInterval();
    }
  }

  private startRemovalInterval(): void {
    this.alertInterval = window.setInterval(() => {
      const alertToRemove = this.alertQueue.shift();
      if (alertToRemove) {
        this.removeAlert(alertToRemove.id);
      }
      if (this.alertQueue.length === 0 && this.alertInterval !== null) {
        clearInterval(this.alertInterval);
        this.alertInterval = null;
      }
    }, this.intervalMs);
  }

  private removeAlert(id: string): void {
    const el = document.getElementById(`alt_${id}`) as HTMLDivElement;
    if (!el) return;

    el.classList.remove("show");
    el.classList.add("hide");
    el.addEventListener(
      "transitionend",
      () => {
        el.remove();
      },
      { once: true },
    );
  }

  private renderAlert(alert: Alert): void {
    const alertTitle = alert.title ? alert.title : ALERT_TITLE[alert.type];
    const alertElement = document.createElement("div");
    alertElement.id = `alt_${alert.id}`;
    alertElement.className = `alert ${alert.type}`;
    alertElement.innerHTML = `<p>${alertTitle.toUpperCase()}:</p>
    <p>${alert.message}</p>`;
    this.alertsContainer?.appendChild(alertElement);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        alertElement.classList.add("show");
      });
    });
  }
}
