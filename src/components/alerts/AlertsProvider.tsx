import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import { AlertsContext, ALERT_TITLE, generateId } from "src/contexts/AlertsContext";
import type { Alert, AlertPayload } from "src/contexts/AlertsContext";
import AlertContainer from "./AlertsContainer";

const AUTO_REMOVE_MS = 3000;

const AlertsProvider = ({ children }: { children: ReactNode }) => {
  const { on } = useEventBus();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addAlert = useCallback(({ message, type }: AlertPayload) => {
    const newAlert: Alert = {
      id: generateId(),
      message,
      timestamp: new Date(),
      title: ALERT_TITLE[type],
      type,
    };

    setAlerts((prev) => [...prev, newAlert]);

    const timer = setTimeout(() => {
      removeAlert(newAlert.id);
    }, AUTO_REMOVE_MS);

    timersRef.current.set(newAlert.id, timer);
  }, [removeAlert]);

  useEffect(() => {
    const unsub = on("alert:add", (payload) => {
      addAlert(payload);
    });
    return unsub;
  }, [on, addAlert]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <AlertsContext.Provider value={{ alerts, addAlert, removeAlert }}>
      {children}
      <AlertContainer />
    </AlertsContext.Provider>
  );
};

export default AlertsProvider;
