import { render, screen, act, fireEvent } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import PathMenu from "./PathMenu";
import { EventBus } from "src/utils/eventBus";
import { PathElement } from "../elements/pathElement";

describe("PathMenu", () => {
  it("initially renders disabled with section title", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <PathMenu />
      </EventBusProvider>
    );
    expect(screen.getByText(/path/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preench/i)).toBeDisabled();
    expect(screen.getByLabelText(/contorno/i)).toBeDisabled();
    expect(screen.getByLabelText(/espessura/i)).toBeDisabled();
  });

  it("shows path properties when PathElement is selected", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <PathMenu />
      </EventBusProvider>,
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const pathElement = new PathElement(
      { x: 0, y: 0 },
      { width: 100, height: 50 },
      1,
    );
    pathElement.points = [
      { x: -50, y: -25 },
      { x: 50, y: -25 },
      { x: 0, y: 25 },
    ];
    act(() => {
      eventBus.emit("selection:changed", {
        selectedElements: [pathElement as never],
      });
    });
    expect(screen.getByLabelText(/preench/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contorno/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/espessura/i)).toBeInTheDocument();
  });

  it("shows closed polygon status text when path is closed", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <PathMenu />
      </EventBusProvider>,
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const pathElement = new PathElement(
      { x: 0, y: 0 },
      { width: 100, height: 50 },
      1,
    );
    pathElement.points = [
      { x: -50, y: -25 },
      { x: 50, y: -25 },
      { x: 0, y: 25 },
    ];
    pathElement.isClosed = true;
    act(() => {
      eventBus.emit("selection:changed", {
        selectedElements: [pathElement as never],
      });
    });
    expect(screen.getByText(/3 pontos/i)).toBeInTheDocument();
  });

  it("toggles hasFill and emits workarea:update", () => {
    const eventBus = new EventBus();
    vi.spyOn(eventBus, "emit");
    render(
      <EventBusProvider eventBus={eventBus}>
        <PathMenu />
      </EventBusProvider>,
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const pathElement = new PathElement(
      { x: 0, y: 0 },
      { width: 100, height: 50 },
      1,
    );
    pathElement.points = [
      { x: -50, y: -25 },
      { x: 50, y: -25 },
      { x: 0, y: 25 },
    ];
    act(() => {
      eventBus.emit("selection:changed", {
        selectedElements: [pathElement as never],
      });
    });
    // Preench checkbox starts unchecked (hasFill = false)
    const fillCheckbox = screen.getByLabelText(/preench/i);
    act(() => {
      fireEvent.click(fillCheckbox);
    });
    expect(pathElement.hasFill).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith("workarea:update");
  });

  it("disables controls on workarea:clear", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <PathMenu />
      </EventBusProvider>,
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const pathElement = new PathElement(
      { x: 0, y: 0 },
      { width: 100, height: 50 },
      1,
    );
    pathElement.points = [
      { x: -50, y: -25 },
      { x: 50, y: -25 },
      { x: 0, y: 25 },
    ];
    act(() => {
      eventBus.emit("selection:changed", {
        selectedElements: [pathElement as never],
      });
    });
    act(() => {
      eventBus.emit("workarea:clear");
    });
    expect(screen.getByLabelText(/preench/i)).toBeDisabled();
  });
});
