import { useEffect, useRef, useState } from "react";
import { EventBus } from "./utils/eventBus";
import { EventBusProvider } from "./contexts/EventBusContext";
import { MainWindow } from "./components/mainWindow";
import CanvasShell from "./components/CanvasShell/CanvasShell";
import ToolMenu from "./components/ToolMenu/ToolMenu";
import SideMenu from "./components/SideMenu/SideMenu";
import TransformMenu from "./components/TransformMenu/TransformMenu";
import LayersMenu from "./components/LayersMenu/LayersMenu";
import TextMenu from "./components/TextMenu/TextMenu";
import GradientMenu from "./components/GradientMenu/GradientMenu";
import DialogController from "./components/dialogs/DialogController";
import AlertsProvider from "./components/alerts/AlertsProvider";
import LoadingProvider from "./components/LoadingOverlay/LoadingProvider";
import type { IProjectData } from "./components/types";
import exampleProject from "./exampleProject.json";

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

  const hasLoadedExample = useRef(false);

  useEffect(() => {
    if (eventBus && canvasRef.current) {
      MainWindow.getInstance(eventBus, { canvas: canvasRef.current });
      if (import.meta.env.DEV && !hasLoadedExample.current) {
        hasLoadedExample.current = true;
        setTimeout(() => {
          eventBus.emit("workarea:createNewProject", {
            projectData: exampleProject as unknown as IProjectData,
          });
        }, 0);
      }
    }
  }, [eventBus]);

  if (!eventBus) return null;

  return (
    <EventBusProvider eventBus={eventBus}>
      <AlertsProvider>
        <LoadingProvider>
          <DialogController />
          <main id="app-window" style={{ display: "flex", flexDirection: "row" }}>
            <ToolMenu />

            <div style={{ flex: 1, position: "relative" }}>
              <CanvasShell ref={canvasRef} />
            </div>

            <SideMenu>
              <TransformMenu />
              <LayersMenu />
              <TextMenu />
              <GradientMenu />
            </SideMenu>
          </main>
        </LoadingProvider>
      </AlertsProvider>
    </EventBusProvider>
  );
};

export default App;
