import { render, screen, act, fireEvent } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import TransformMenu from "./TransformMenu";
import { EventBus } from "src/utils/eventBus";
import { CroppingBox } from "src/utils/croppingBox";

describe("TransformMenu", () => {
  it("disables sliders when no element is selected", () => {
    const { container } = render(
      <EventBusProvider eventBus={new EventBus()}>
        <TransformMenu />
      </EventBusProvider>
    );
    expect(container.querySelector("#x-pos-input")).toBeDisabled();
    expect(container.querySelector("#y-pos-input")).toBeDisabled();
  });

  it("updates values on transformBox:properties:change", () => {
    const eventBus = new EventBus();
    const { container } = render(
      <EventBusProvider eventBus={eventBus}>
        <TransformMenu />
      </EventBusProvider>
    );

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [{} as any] });
    });
    act(() => {
      eventBus.emit("transformBox:properties:change", {
        position: { x: 100, y: 200 },
        size: { width: 800, height: 600 },
        rotation: 45, opacity: 0.5,
      });
    });

    expect(container.querySelector("#x-pos-input")).toHaveValue(100);
    expect(container.querySelector("#y-pos-input")).toHaveValue(200);
  });

  it("shows cropping accordion when element supports cropping", () => {
    const eventBus = new EventBus();
    const croppingBox = new CroppingBox({ width: 800, height: 600 });
    eventBus.on("transformBox:cropping:get", () => croppingBox);
    eventBus.on("transformBox:properties:get", () => ({
      position: { x: 0, y: 0 },
      size: { width: 800, height: 600 },
      rotation: 0, opacity: 1,
      unscaledSize: { width: 800, height: 600 },
    }));
    const { container } = render(
      <EventBusProvider eventBus={eventBus}>
        <TransformMenu />
      </EventBusProvider>
    );

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [{} as any] });
    });

    expect(screen.getByText("Recorte")).toBeInTheDocument();
    const accordion = container.querySelector("details");
    expect(accordion).not.toHaveAttribute("data-disabled");
  });

  it("disables cropping accordion for non-croppable elements", () => {
    const eventBus = new EventBus();
    eventBus.on("transformBox:cropping:get", () => null);
    const { container } = render(
      <EventBusProvider eventBus={eventBus}>
        <TransformMenu />
      </EventBusProvider>
    );

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [{} as any] });
    });

    const accordion = container.querySelector("details");
    expect(accordion).toHaveAttribute("data-disabled");
  });

  it("emits transformMenu:cropping:update when crop slider changes", () => {
    const eventBus = new EventBus();
    const emitSpy = vi.spyOn(eventBus, "emit");
    const croppingBox = new CroppingBox({ width: 800, height: 600 });
    eventBus.on("transformBox:cropping:get", () => croppingBox);
    eventBus.on("transformBox:properties:get", () => ({
      position: { x: 0, y: 0 },
      size: { width: 800, height: 600 },
      rotation: 0, opacity: 1,
      unscaledSize: { width: 800, height: 600 },
    }));
    const { container } = render(
      <EventBusProvider eventBus={eventBus}>
        <TransformMenu />
      </EventBusProvider>
    );

    act(() => {
      eventBus.emit("selection:changed", { selectedElements: [{} as any] });
    });

    const topInput = container.querySelector("#crop-top-input") as HTMLInputElement;
    fireEvent.change(topInput, { target: { value: "50" } });
    expect(emitSpy).toHaveBeenCalledWith("transformMenu:cropping:update", { property: "top", value: 50 });
  });
});
