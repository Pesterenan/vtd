import { render, screen, act } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import TextMenu from "./TextMenu";
import { EventBus } from "src/utils/eventBus";
import { TextElement } from "../elements/textElement";

describe("TextMenu", () => {
  it("shows text properties when text element is selected", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <TextMenu />
      </EventBusProvider>
    );
    act(() => {
      eventBus.emit("workarea:initialized");
    });
    const textElement = new TextElement({ x: 0, y: 0 }, { width: 100, height: 50 }, 1);
    textElement.content = ["Hello"];
    act(() => {
      eventBus.emit("selection:changed", {
        selectedElements: [textElement as any],
      });
    });
    expect(screen.getByDisplayValue("Hello")).toBeInTheDocument();
  });
});
