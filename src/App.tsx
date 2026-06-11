import { useEffect, useRef, useState } from "react";
import { EventBus } from "./utils/eventBus";
import { EventBusProvider } from "./contexts/EventBusContext";
import { MainWindow } from "./components/mainWindow";
import { MIGRATION } from "./migrationFlags";
import CanvasShell from "./components/CanvasShell/CanvasShell";
import ToolMenu from "./components/ToolMenu/ToolMenu";
import SideMenu from "./components/SideMenu/SideMenu";
import TransformMenu from "./components/TransformMenu/TransformMenu";
import LayersMenu from "./components/LayersMenu/LayersMenu";
import TextMenu from "./components/TextMenu/TextMenu";
import GradientMenu from "./components/GradientMenu/GradientMenu";
import DialogController from "./components/Dialogs/DialogController";
import AlertsProvider from "./components/Alerts/AlertsProvider";
import LoadingProvider from "./components/LoadingOverlay/LoadingProvider";

let vtdInitialized = false;

const App = () => {
  const [eventBus, setEventBus] = useState<EventBus | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (vtdInitialized) return;
    vtdInitialized = true;
    const bus = new EventBus();
    setEventBus(bus);
  }, []);

  useEffect(() => {
    if (eventBus && canvasRef.current) {
      MainWindow.getInstance(eventBus, { canvas: canvasRef.current });
    }
  }, [eventBus]);

  if (!eventBus) return null;

  return (
    <EventBusProvider eventBus={eventBus}>
      <AlertsProvider>
        <LoadingProvider>
          <DialogController />
          <main id="app-window" style={{ display: "flex", flexDirection: "row" }}>
            {MIGRATION.ToolMenu ? <ToolMenu /> : <div id="vanilla-tool-menu" />}

            <div style={{ flex: 1, position: "relative" }}>
              <CanvasShell ref={canvasRef} />
            </div>
            {MIGRATION.SideMenu ? (
              <SideMenu>
                {MIGRATION.TransformMenu ? <TransformMenu /> : <div id="vanilla-transform-menu" />}
                {MIGRATION.LayersMenu ? <LayersMenu /> : <div id="vanilla-layers-menu" />}
                {MIGRATION.TextMenu ? <TextMenu /> : <div id="vanilla-text-menu" />}
                {MIGRATION.GradientMenu ? <GradientMenu /> : <div id="vanilla-gradient-menu" />}
              </SideMenu>
            ) : (
              <div id="vanilla-side-menu" />
            )}
          </main>
        </LoadingProvider>
      </AlertsProvider>
    </EventBusProvider>
  );
};

export default App;
