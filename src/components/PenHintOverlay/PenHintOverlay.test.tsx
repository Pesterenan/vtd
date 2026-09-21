import { act } from "react";
import { render, screen } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import PenHintOverlay from "./PenHintOverlay";

describe("PenHintOverlay", () => {
  const emitHint = (eventBus: EventBus, visible: boolean) => {
    act(() => {
      eventBus.emit("pen:hint", { visible });
    });
  };

  it("não renderiza nada sem evento pen:hint", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <PenHintOverlay />
      </EventBusProvider>,
    );

    expect(screen.queryByText(/enter: fechar/i)).not.toBeInTheDocument();
  });

  it("mostra os atalhos quando pen:hint é emitido como visível", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <PenHintOverlay />
      </EventBusProvider>,
    );

    emitHint(eventBus, true);

    expect(screen.getByText(/enter: fechar/i)).toBeInTheDocument();
  });

  it("esconde os atalhos quando pen:hint é emitido como invisível", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <PenHintOverlay />
      </EventBusProvider>,
    );

    emitHint(eventBus, true);
    expect(screen.getByText(/enter: fechar/i)).toBeInTheDocument();

    emitHint(eventBus, false);

    expect(screen.queryByText(/enter: fechar/i)).not.toBeInTheDocument();
  });
});