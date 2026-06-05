import { fireEvent, render, screen, act } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import LayersMenu from "./LayersMenu";
import { EventBus } from "src/utils/eventBus";

describe("LayersMenu", () => {
  it("renders layers from event bus", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <LayersMenu />
      </EventBusProvider>,
    );
    act(() => {
      eventBus.emit("workarea:addElement", {
        elementId: 1, layerName: "Layer 1", isVisible: true, isLocked: false, type: "image",
      });
    });
    expect(screen.getByText("Layer 1")).toBeInTheDocument();
  });

  it("emits workarea:selectById on layer click", () => {
    const eventBus = new EventBus();
    const emitSpy = vi.spyOn(eventBus, "emit");
    render(
      <EventBusProvider eventBus={eventBus}>
        <LayersMenu />
      </EventBusProvider>,
    );
    act(() => {
      eventBus.emit("workarea:addElement", {
        elementId: 1, layerName: "Layer 1", isVisible: true, isLocked: false, type: "image",
      });
    });
    fireEvent.click(screen.getByText("Layer 1"));
    expect(emitSpy).toHaveBeenCalledWith("workarea:selectById", {
      elementsId: new Set([1]),
    });
  });
});
