import type { ReactNode } from "react";
import { createContext, useRef, useCallback } from "react";
import type { EventBus, EventBusMap, Callback } from "src/utils/eventBus";

export interface EventBusContextValue {
  emit: <K extends keyof EventBusMap>(
    event: K,
    payload?: EventBusMap[K]["payload"],
  ) => void;
  on: <K extends keyof EventBusMap>(
    event: K,
    cb: Callback<EventBusMap[K]["payload"], EventBusMap[K]["result"]>,
  ) => () => void;
  request: <K extends keyof EventBusMap>(
    event: K,
    payload?: EventBusMap[K]["payload"],
  ) => EventBusMap[K]["result"][];
}

export const EventBusContext = createContext<EventBusContextValue | null>(null);

export const EventBusProvider = ({
  eventBus,
  children,
}: {
  eventBus: EventBus;
  children: ReactNode;
}) => {
  const eventBusRef = useRef(eventBus);

  const emit = useCallback(<K extends keyof EventBusMap>(
    event: K,
    payload?: EventBusMap[K]["payload"],
  ) => {
    eventBusRef.current.emit(event, payload);
  }, []);

  const on = useCallback(<K extends keyof EventBusMap>(
    event: K,
    cb: Callback<EventBusMap[K]["payload"], EventBusMap[K]["result"]>,
  ) => {
    eventBusRef.current.on(event, cb);
    return () => eventBusRef.current.off(event, cb);
  }, []);

  const request = useCallback(<K extends keyof EventBusMap>(
    event: K,
    payload?: EventBusMap[K]["payload"],
  ) => {
    return eventBusRef.current.request(event, payload);
  }, []);

  return (
    <EventBusContext.Provider value={{ emit, on, request }}>
      {children}
    </EventBusContext.Provider>
  );
}
