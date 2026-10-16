import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import LayersMenu from "./LayersMenu";
import { EventBus } from "src/utils/eventBus";

// jsdom does not implement DragEvent. Aliasing it to MouseEvent lets us drive
// the drag handlers with a real clientY (plus a stubbed dataTransfer), which the
// reorder logic depends on.
if (typeof window.DragEvent === "undefined") {
  Object.defineProperty(window, "DragEvent", {
    value: window.MouseEvent,
    configurable: true,
  });
}

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

  const setupLayers = (eventBus: EventBus, ids: number[]) => {
    act(() => {
      eventBus.emit("workarea:initialized");
      for (const id of ids) {
        eventBus.emit("workarea:addElement", {
          elementId: id,
          layerName: `Layer ${id}`,
          isVisible: true,
          isLocked: false,
          type: "text",
        });
      }
    });
  };

  const mockGeometry = (el: HTMLElement, top: number, height = 30) => {
    el.getBoundingClientRect = () =>
      ({ top, height, bottom: top + height, left: 0, right: 200, width: 200, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  };

  const dragLayer = (
    sourceId: number,
    targetId: number,
    targetHalf: "upper" | "lower",
  ) => {
    const source = document.getElementById(`layer-${sourceId}`) as HTMLLIElement;
    const target = document.getElementById(`layer-${targetId}`) as HTMLLIElement;
    mockGeometry(source, 0);
    mockGeometry(target, 100);
    const dataTransfer = { setData: () => undefined, effectAllowed: "" };
    // Upper half of the target renders the "insert above" indicator; lower half
    // renders "insert below". The list is reversed in CSS, so these map to
    // opposite array indexes.
    const clientY = targetHalf === "upper" ? 105 : 125;
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer, clientY });
    fireEvent.drop(target, { dataTransfer, clientY });
  };

  it("inserts a dragged layer above the target when dropped on its upper half", () => {
    const eventBus = new EventBus();
    let emittedIds: number[] = [];
    eventBus.on("layer:generateHierarchy", ({ hierarchy }) => {
      emittedIds = hierarchy.map((layer) => layer.id);
    });
    render(
      <EventBusProvider eventBus={eventBus}>
        <LayersMenu />
      </EventBusProvider>,
    );
    setupLayers(eventBus, [1, 2, 3]);

    dragLayer(1, 3, "upper");

    // Array order is back-to-front: [2, 3, 1] renders visually as 1, 3, 2,
    // i.e. layer 1 lands above layer 3.
    expect(emittedIds).toEqual([2, 3, 1]);
  });

  it("inserts a dragged layer below the target when dropped on its lower half", () => {
    const eventBus = new EventBus();
    let emittedIds: number[] = [];
    eventBus.on("layer:generateHierarchy", ({ hierarchy }) => {
      emittedIds = hierarchy.map((layer) => layer.id);
    });
    render(
      <EventBusProvider eventBus={eventBus}>
        <LayersMenu />
      </EventBusProvider>,
    );
    setupLayers(eventBus, [1, 2, 3]);

    dragLayer(3, 1, "lower");

    // Visual result: 2, 1, 3 -> layer 3 lands below layer 1.
    expect(emittedIds).toEqual([3, 1, 2]);
  });

  it("does not mark an empty group as selected", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <LayersMenu />
      </EventBusProvider>,
    );
    act(() => {
      eventBus.emit("workarea:initialized");
      eventBus.emit("workarea:addElement", {
        elementId: 10,
        layerName: "Grupo",
        isVisible: true,
        isLocked: false,
        type: "group",
        children: [],
      });
    });
    expect(document.getElementById("layer-10")?.className).not.toContain(
      "selected",
    );
  });

  it("clears the highlight when the canvas reports an empty selection", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <LayersMenu />
      </EventBusProvider>,
    );
    setupLayers(eventBus, [1, 2, 3]);
    act(() => {
      eventBus.emit("workarea:selectById", { elementsId: new Set([2]) });
    });
    expect(document.getElementById("layer-2")?.className).toContain("selected");

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [] });
    });
    expect(document.getElementById("layer-2")?.className).not.toContain(
      "selected",
    );
  });

  it("marks the dragged layer while dragging", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <LayersMenu />
      </EventBusProvider>,
    );
    setupLayers(eventBus, [1, 2, 3]);
    const source = document.getElementById("layer-1") as HTMLLIElement;
    fireEvent.dragStart(source, {
      dataTransfer: { setData: () => undefined, effectAllowed: "" },
    });
    expect(source.className).toContain("dragging");
  });

  it("highlights a group as the nest target when hovering it", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <LayersMenu />
      </EventBusProvider>,
    );
    act(() => {
      eventBus.emit("workarea:initialized");
      eventBus.emit("workarea:addElement", {
        elementId: 1,
        layerName: "Layer 1",
        isVisible: true,
        isLocked: false,
        type: "text",
      });
      eventBus.emit("workarea:addElement", {
        elementId: 10,
        layerName: "Grupo",
        isVisible: true,
        isLocked: false,
        type: "group",
        children: [{ id: 5, name: "Filho", isVisible: true, isLocked: false }],
      });
    });
    const source = document.getElementById("layer-1") as HTMLLIElement;
    const group = document.getElementById("layer-10") as HTMLLIElement;
    mockGeometry(group, 100);
    const dataTransfer = { setData: () => undefined, effectAllowed: "" };
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(group, { dataTransfer, clientY: 105 });
    expect(group.className).toContain("dragOverInside");
  });

  it("shows a top-edge insertion line when hovering the upper half of a layer", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <LayersMenu />
      </EventBusProvider>,
    );
    setupLayers(eventBus, [1, 2, 3]);
    const source = document.getElementById("layer-1") as HTMLLIElement;
    const target = document.getElementById("layer-3") as HTMLLIElement;
    mockGeometry(target, 100);
    const dataTransfer = { setData: () => undefined, effectAllowed: "" };
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer, clientY: 105 });
    expect(target.className).toContain("dragOverBefore");
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
