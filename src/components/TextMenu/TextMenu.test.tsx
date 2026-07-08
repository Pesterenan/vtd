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
        selectedElements: [textElement as never],
      });
    });
    expect(screen.getByDisplayValue("Hello")).toBeInTheDocument();
  });

  it("shows accept/decline buttons when text is selected", () => {
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
        selectedElements: [textElement as never],
      });
    });
    expect(screen.getByTitle(/aceitar/i)).toBeInTheDocument();
    expect(screen.getByTitle(/descartar/i)).toBeInTheDocument();
  });

  it("emits edit:acceptTextChange on accept click", () => {
    const eventBus = new EventBus();
    vi.spyOn(eventBus, "emit");
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
        selectedElements: [textElement as never],
      });
    });
    act(() => {
      eventBus.emit("edit:acceptTextChange");
    });
    expect(screen.queryByDisplayValue("Hello")).not.toBeInTheDocument();
  });

  it("restores original content on edit:declineTextChange", () => {
    const eventBus = new EventBus();
    vi.spyOn(eventBus, "emit");
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
        selectedElements: [textElement as never],
      });
    });
    textElement.content = ["Changed"];
    act(() => {
      eventBus.emit("edit:declineTextChange");
    });
    expect(textElement.content[0]).toBe("Hello");
  });
});
