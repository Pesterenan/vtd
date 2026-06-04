import { useEffect, useRef } from "react";
import { EventBus } from "./utils/eventBus";
import { EventBusProvider } from "./contexts/EventBusContext";
import { initializeVTD } from "./renderer";
import CanvasShell from "./components/CanvasShell/CanvasShell";
import { MIGRATION } from "./migrationFlags";
import { ToolMenu } from "./components/ToolMenu/ToolMenu";
import { SideMenu } from "./components/SideMenu/SideMenu";

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
      <div id="app-window" style={{ display: "flex", flexDirection: "row" }}>
        {MIGRATION.ToolMenu ? <ToolMenu /> : <div id="vanilla-tool-menu" />}

        <div style={{ flex: 1, position: "relative" }}>
          <CanvasShell />
        </div>

        {MIGRATION.SideMenu ? (
          <SideMenu>
            <div id="vanilla-transform-menu" />
            <div id="vanilla-layers-menu" />
            <div id="vanilla-text-menu" />
            <div id="vanilla-gradient-menu" />
          </SideMenu>
        ) : (
          <div id="vanilla-side-menu" />
        )}
      </div>
    </EventBusProvider>
  );
};

export default App;
