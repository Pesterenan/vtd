import { useEffect, useRef } from "react";
import { EventBus } from "./utils/eventBus";
import { EventBusProvider } from "./contexts/EventBusContext";
import { initializeVTD } from "./renderer";
import { CanvasShell } from "./components/CanvasShell/CanvasShell";

const App = () => {
  const eventBusRef = useRef<EventBus | null>(null);

  useEffect(() => {
    const eventBus = new EventBus();
    eventBusRef.current = eventBus;
    initializeVTD(eventBus);
  }, []);

  if (!eventBusRef.current) return null;

  return (
    <EventBusProvider eventBus={eventBusRef.current}>
      <div
        id="app-root"
        style={{ display: "flex", flexDirection: "row", width: "100%", height: "100%" }}
      >
        <CanvasShell />
      </div>
    </EventBusProvider>
  );
}

export default App;
