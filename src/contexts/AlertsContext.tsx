import { createContext } from "react";

export interface AlertPayload {
  message: string;
  type: "success" | "error";
}

export interface Alert {
  id: string;
  message: string;
  timestamp: Date;
  title?: string;
  type: AlertPayload["type"];
}

export const ALERT_TITLE: Record<Alert["type"], string> = {
  success: "Sucesso",
  error: "Erro",
};

export interface AlertsContextValue {
  alerts: Alert[];
  addAlert: (payload: AlertPayload) => void;
  removeAlert: (id: string) => void;
}

export const AlertsContext = createContext<AlertsContextValue | null>(null);

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
