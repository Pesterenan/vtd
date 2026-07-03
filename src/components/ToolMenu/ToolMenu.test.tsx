import { render, screen, fireEvent } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import ToolMenu from "./ToolMenu";

describe("ToolMenu", () => {
  it("emits tool:change when a tool button is clicked", () => {
    const eventBus = new EventBus();
    const emitSpy = vi.spyOn(eventBus, "emit");

    render(
      <EventBusProvider eventBus={eventBus}>
        <ToolMenu />
      </EventBusProvider>
    );

    const selectBtn = screen.getByLabelText(/selecionar/i);
    fireEvent.pointerDown(selectBtn);
    fireEvent.pointerUp(selectBtn);
    expect(emitSpy).toHaveBeenCalledWith("tool:change", expect.any(String));
  });

  it("highlights the active tool", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <ToolMenu />
      </EventBusProvider>
    );

    const selectBtn = screen.getByLabelText(/selecionar/i);
    fireEvent.pointerDown(selectBtn);
    fireEvent.pointerUp(selectBtn);

    expect(selectBtn).toHaveClass(/active/);
  });
});

