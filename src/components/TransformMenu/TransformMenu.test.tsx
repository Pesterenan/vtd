import { render, screen, act } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import TransformMenu from "./TransformMenu";
import { EventBus } from "src/utils/eventBus";

type MockElement = { type: string };

describe("TransformMenu", () => {
  it("disables when no element is selected", () => {
    const { container } = render(
      <EventBusProvider eventBus={new EventBus()}>
        <TransformMenu />
      </EventBusProvider>
    );
    expect(container.querySelector("section")).toHaveAttribute("aria-disabled", "true");
  });

  it("updates values on transformBox:properties:change", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <TransformMenu />
      </EventBusProvider>
    );

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [{} as MockElement] });
    });
    act(() => {
      eventBus.emit("transformBox:properties:change", {
        position: { x: 100, y: 200 },
        size: { width: 800, height: 600 },
        rotation: 45, opacity: 0.5,
      });
    });

    expect(screen.getByDisplayValue("100")).toBeInTheDocument();
    expect(screen.getByDisplayValue("200")).toBeInTheDocument();
  });
});
