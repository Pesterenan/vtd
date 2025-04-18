import EVENT from "src/utils/customEvents";
import getElementById from "src/utils/getElementById";

interface Alert {
  id: string;
  message: string;
  type: "sucesso" | "erro";
  timestamp: Date;
}

export class Alerts {
  private alertQueue: Alert[];
  private alertInterval: number | null = null;
  private alertsContainer: HTMLDivElement | null = null;
  private readonly intervalMs: number = 3000;

  constructor() {
    this.alertQueue = [];
    this.createDOMElements();
    this.addEventListeners();
  }

  private createDOMElements(): void {
    const mainWindow = getElementById<HTMLDivElement>("main-window");
    this.alertsContainer = document.createElement("div");
    this.alertsContainer.id = "alerts-container";
    mainWindow.appendChild(this.alertsContainer);
  }

  private addEventListeners(): void {
    window.addEventListener(EVENT.ADD_ALERT, this.addAlert.bind(this));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private addAlert(evt: Event): void {
    const customEvent = evt as CustomEvent<Pick<Alert, "message" | "type">>;
    const { message, type } = customEvent.detail;
    const newAlert: Alert = {
      id: this.generateId(),
      message,
      type,
      timestamp: new Date(),
    };
    this.renderAlert(newAlert);
    this.alertQueue.push(newAlert);
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
    this.alertQueue = this.alertQueue.filter((alert) => alert.id !== id);
    this.alertsContainer?.removeChild(
      document.getElementById(`alt_${id}`) as HTMLDivElement,
    );
  }

  private renderAlert(alert: Alert): void {
    const alertElement = document.createElement("div");
    alertElement.id = `alt_${alert.id}`;
    alertElement.className = `alert ${alert.type}`;
    alertElement.innerHTML = `<p>${alert.type.toUpperCase()}:</p>
    <p>${alert.message}</p>`;
    this.alertsContainer?.appendChild(alertElement);
  }
}
