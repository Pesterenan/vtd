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

  it("selects a locked layer when clicking on it", () => {
    const eventBus = new EventBus();
    const emitSpy = vi.spyOn(eventBus, "emit");
    render(
      <EventBusProvider eventBus={eventBus}>
        <LayersMenu />
      </EventBusProvider>,
    );
    act(() => {
      eventBus.emit("workarea:addElement", {
        elementId: 1, layerName: "Layer 1", isVisible: true, isLocked: true, type: "image",
      });
    });
    fireEvent.click(screen.getByText("Layer 1"));
    expect(emitSpy).toHaveBeenCalledWith("workarea:selectById", {
      elementsId: new Set([1]),
    });
  });

  it("emits workarea:updateElement with isLocked when toggling lock checkbox", () => {
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
    const lockCheckbox = document.getElementById("tgl_lock-1_input") as HTMLInputElement;
    fireEvent.click(lockCheckbox);
    expect(emitSpy).toHaveBeenCalledWith("workarea:updateElement", {
      elementId: 1,
      isLocked: true,
    });
  });

  it("clears selection when workarea:selectById is emitted with empty set", () => {
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
    const layerItem = screen.getByText("Layer 1").closest("li");
    act(() => {
      eventBus.emit("workarea:selectById", { elementsId: new Set([1]) });
    });
    expect(layerItem?.className).toContain("selected");
    act(() => {
      eventBus.emit("workarea:selectById", { elementsId: new Set([]) });
    });
    expect(layerItem?.className).not.toContain("selected");
  });

  it("shows context menu on right-click", () => {
    const eventBus = new EventBus();
    eventBus.on("workarea:getElement:get", () => undefined);
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
    const layerItem = screen.getByText("Layer 1").closest("li");
    if (layerItem) {
      fireEvent.contextMenu(layerItem);
    }
    expect(screen.getByText("Editar Filtros do Elemento")).toBeInTheDocument();
    expect(screen.getByText("Apagar Elemento")).toBeInTheDocument();
  });

  it("emits workarea:deleteElement from context menu", () => {
    const eventBus = new EventBus();
    const emitSpy = vi.spyOn(eventBus, "emit");
    eventBus.on("workarea:getElement:get", () => undefined);
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
    const layerItem = screen.getByText("Layer 1").closest("li");
    if (layerItem) {
      fireEvent.contextMenu(layerItem);
    }
    fireEvent.click(screen.getByText("Apagar Elemento"));
    expect(emitSpy).toHaveBeenCalledWith("workarea:deleteElement", { elementId: 1 });
  });

  it("closes context menu on Escape", () => {
    const eventBus = new EventBus();
    eventBus.on("workarea:getElement:get", () => undefined);
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
    const layerItem = screen.getByText("Layer 1").closest("li");
    if (layerItem) {
      fireEvent.contextMenu(layerItem);
    }
    expect(screen.getByText("Editar Filtros do Elemento")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Editar Filtros do Elemento")).not.toBeInTheDocument();
  });
});
