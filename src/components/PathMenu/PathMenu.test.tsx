import { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
      { center: { x: -50, y: -25 }, in: null, out: null },
      { center: { x: 50, y: -25 }, in: null, out: null },
      { center: { x: 0, y: 25 }, in: null, out: null },
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
      { center: { x: -50, y: -25 }, in: null, out: null },
      { center: { x: 50, y: -25 }, in: null, out: null },
      { center: { x: 0, y: 25 }, in: null, out: null },
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
      { center: { x: -50, y: -25 }, in: null, out: null },
      { center: { x: 50, y: -25 }, in: null, out: null },
      { center: { x: 0, y: 25 }, in: null, out: null },
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
      { center: { x: -50, y: -25 }, in: null, out: null },
      { center: { x: 50, y: -25 }, in: null, out: null },
      { center: { x: 0, y: 25 }, in: null, out: null },
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

  it("ref inflige the real fill/stroke colors in the ColorPickers", () => {
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
    pathElement.fillColor = "#ff0000";
    pathElement.strokeColor = "#00ff00";
    pathElement.hasFill = true;
    pathElement.hasStroke = true;
    act(() => {
      eventBus.emit("selection:changed", {
        selectedElements: [pathElement as never],
      });
    });
    expect(
      (document.getElementById("path-fill-color-color-input") as HTMLInputElement).value,
    ).toBe("#ff0000");
    expect(
      (document.getElementById("path-stroke-color-color-input") as HTMLInputElement).value,
    ).toBe("#00ff00");
  });

  it("updates contour options on the path and emits workarea:update", () => {
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
      { center: { x: -50, y: -25 }, in: null, out: null },
      { center: { x: 50, y: -25 }, in: null, out: null },
      { center: { x: 0, y: 25 }, in: null, out: null },
    ];
    act(() => {
      eventBus.emit("selection:changed", {
        selectedElements: [pathElement as never],
      });
    });

    const lineCapSelect = screen.getByLabelText(/extremidade/i);
    fireEvent.change(lineCapSelect, { target: { value: "square" } });
    expect(pathElement.lineCap).toBe("square");

    const lineJoinSelect = screen.getByLabelText(/junção/i);
    fireEvent.change(lineJoinSelect, { target: { value: "round" } });
    expect(pathElement.lineJoin).toBe("round");

    const lineDashSelect = screen.getByLabelText(/tracejado/i);
    fireEvent.change(lineDashSelect, { target: { value: "dashed" } });
    expect(pathElement.lineDash).toBe("dashed");

    const miterInput = document.getElementById(
      "path-miter-limit-input",
    ) as HTMLInputElement;
    fireEvent.change(miterInput, { target: { value: "25" } });
    expect(pathElement.miterLimit).toBe(25);

    expect(eventBus.emit).toHaveBeenCalledWith("workarea:update");
  });

  it("disables the miter limit slider when lineJoin is not miter", () => {
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
    pathElement.lineJoin = "bevel";
    act(() => {
      eventBus.emit("selection:changed", {
        selectedElements: [pathElement as never],
      });
    });
    expect(
      (document.getElementById("path-miter-limit-input") as HTMLInputElement)
        .disabled,
    ).toBe(true);

    pathElement.lineJoin = "miter";
    act(() => {
      eventBus.emit("selection:changed", {
        selectedElements: [pathElement as never],
      });
    });
    expect(
      (document.getElementById("path-miter-limit-input") as HTMLInputElement)
        .disabled,
    ).toBe(false);
  });
});
