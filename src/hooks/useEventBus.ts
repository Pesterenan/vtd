import { useContext } from "react";
import { EventBusContext } from "../contexts/EventBusContext";
import type { EventBusContextValue } from "../contexts/EventBusContext";

export const useEventBus = (): EventBusContextValue => {
  const ctx = useContext(EventBusContext);
  if (!ctx) {
    throw new Error("useEventBus must be used within an EventBusProvider");
  }
  return ctx;
}
