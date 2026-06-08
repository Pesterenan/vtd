import { render, screen, act } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import GradientMenu from "./GradientMenu";
import { EventBus } from "src/utils/eventBus";
import { GradientElement } from "../elements/gradientElement";

describe("GradientMenu", () => {
  it("renders gradient bar with color stops when gradient selected", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <GradientMenu />
      </EventBusProvider>
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const el = new GradientElement({ x: 0, y: 0 }, { width: 100, height: 50 }, 1);
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventBus.emit("selection:changed", { selectedElements: [el as any] });
    });
    expect(screen.getByText(/gradiente/i)).toBeInTheDocument();
  });

  it("shows color picker for selected stop", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <GradientMenu />
      </EventBusProvider>
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const el = new GradientElement({ x: 0, y: 0 }, { width: 100, height: 50 }, 1);
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventBus.emit("selection:changed", { selectedElements: [el as any] });
    });
    expect(screen.getByLabelText(/cor/i)).toBeInTheDocument();
  });

  it("shows format selector", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <GradientMenu />
      </EventBusProvider>
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const el = new GradientElement({ x: 0, y: 0 }, { width: 100, height: 50 }, 1);
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventBus.emit("selection:changed", { selectedElements: [el as any] });
    });
    expect(screen.getByLabelText(/formato/i)).toBeInTheDocument();
    expect(screen.getByText("Linear")).toBeInTheDocument();
  });
});
