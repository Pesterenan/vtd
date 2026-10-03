import { act } from "react";
import { render, screen } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import ToolHintOverlay from "./ToolHintOverlay";

describe("ToolHintOverlay", () => {
  const emitHint = (eventBus: EventBus, hintText?: string) => {
    act(() => {
      eventBus.emit("tool:hint", {  hintText });
    });
  };

  it("não renderiza nada sem evento tool:hint", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <ToolHintOverlay />
      </EventBusProvider>,
    );

    expect(screen.queryByText(/tool hint/i)).not.toBeInTheDocument();
  });

  it("mostra os atalhos quando tool:hint é emitido como visível", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <ToolHintOverlay />
      </EventBusProvider>,
    );

    emitHint(eventBus, "tool hint");

    expect(screen.getByText(/tool hint/i)).toBeInTheDocument();
  });

  it("esconde os atalhos quando tool:hint é emitido como invisível", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <ToolHintOverlay />
      </EventBusProvider>,
    );

    emitHint(eventBus, "tool hint");
    expect(screen.getByText(/tool hint/i)).toBeInTheDocument();

    emitHint(eventBus);

    expect(screen.queryByText(/tool hint/i)).not.toBeInTheDocument();
  });

  it("atualiza o texto a cada tool:hint sequencial (ex. roda do mouse)", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <ToolHintOverlay />
      </EventBusProvider>,
    );

    emitHint(eventBus, "Forma: polygon - Lados: 5");
    emitHint(eventBus, "Forma: polygon - Lados: 6");
    emitHint(eventBus, "Forma: polygon - Lados: 7");

    expect(screen.getByText(/Lados: 7/i)).toBeInTheDocument();
  });

  it("limpa o overlay ao receber tool:unequipped", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <ToolHintOverlay />
      </EventBusProvider>,
    );

    emitHint(eventBus, "tool hint");
    expect(screen.getByText(/tool hint/i)).toBeInTheDocument();

    act(() => {
      eventBus.emit("tool:unequipped", {} as never);
    });

    expect(screen.queryByText(/tool hint/i)).not.toBeInTheDocument();
  });
});
