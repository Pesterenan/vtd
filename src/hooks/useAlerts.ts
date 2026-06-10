import { useContext } from "react";
import { AlertsContext } from "../contexts/AlertsContext";
import type { AlertsContextValue } from "../contexts/AlertsContext";

export const useAlerts = (): AlertsContextValue => {
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    throw new Error("useAlerts must be used within an AlertsProvider");
  }
  return ctx;
}
