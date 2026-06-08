import { useEffect, useState } from "react";
import { EventBus } from "./utils/eventBus";
import { EventBusProvider } from "./contexts/EventBusContext";
import { initializeVTD } from "./renderer";
import CanvasShell from "./components/CanvasShell/CanvasShell";
import { MIGRATION } from "./migrationFlags";
import ToolMenu from "./components/ToolMenu/ToolMenu";
import SideMenu from "./components/SideMenu/SideMenu";
import TransformMenu from "./components/TransformMenu/TransformMenu";
import LayersMenu from "./components/LayersMenu/LayersMenu";
import TextMenu from "./components/TextMenu/TextMenu";
import GradientMenu from "./components/GradientMenu/GradientMenu";
import DialogBase from "./components/Dialogs/DialogBase";
import DialogController from "./components/Dialogs/DialogController";

let vtdInitialized = false;

const App = () => {
  const [eventBus, setEventBus] = useState<EventBus | null>(null);

  useEffect(() => {
    if (vtdInitialized) return;
    vtdInitialized = true;
    const bus = new EventBus();
    setEventBus(bus);
    initializeVTD(bus);
  }, []);

  if (!eventBus) return null;

  return (
    <EventBusProvider eventBus={eventBus}>
      <DialogController />
        <main id="app-window" style={{ display: "flex", flexDirection: "row" }}>
          {MIGRATION.ToolMenu ? <ToolMenu /> : <div id="vanilla-tool-menu" />}

          <div style={{ flex: 1, position: "relative" }}>
            <CanvasShell />
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
    </EventBusProvider>
  );
};

export default App;
