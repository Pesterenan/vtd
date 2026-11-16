import { render, screen, fireEvent } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import { TOOL } from "src/components/types";
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

  it("renders a button for the Pen tool", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <ToolMenu />
      </EventBusProvider>
    );

    const penBtn = screen.getByLabelText(/Criar caminhos vetoriais/i);
    expect(penBtn).toBeInTheDocument();
  });

  it("emits tool:change with TOOL.PEN when Pen tool is clicked", () => {
    const eventBus = new EventBus();
    const emitSpy = vi.spyOn(eventBus, "emit");

    render(
      <EventBusProvider eventBus={eventBus}>
        <ToolMenu />
      </EventBusProvider>
    );

    const penBtn = screen.getByLabelText(/Criar caminhos vetoriais/i);
    fireEvent.click(penBtn);

    expect(emitSpy).toHaveBeenCalledWith("tool:change", TOOL.PEN);
  });

  it("renders the Eyedropper tool before the Hand tool", () => {
    const eventBus = new EventBus();
    const { container } = render(
      <EventBusProvider eventBus={eventBus}>
        <ToolMenu />
      </EventBusProvider>,
    );

    const eyedropperBtn = screen.getByLabelText(
      /Copiar cores de elementos e do canvas/i,
    );
    const handBtn = screen.getByLabelText(/Mover Área de Trabalho/i);
    const items = Array.from(container.querySelectorAll<HTMLElement>("button"));

    expect(eyedropperBtn).toBeInTheDocument();
    expect(items.indexOf(eyedropperBtn)).toBeLessThan(items.indexOf(handBtn));
  });

  it("emits tool:change with TOOL.EYEDROPPER when clicked", () => {
    const eventBus = new EventBus();
    const emitSpy = vi.spyOn(eventBus, "emit");

    render(
      <EventBusProvider eventBus={eventBus}>
        <ToolMenu />
      </EventBusProvider>,
    );

    fireEvent.click(screen.getByLabelText(/Copiar cores de elementos e do canvas/i));

    expect(emitSpy).toHaveBeenCalledWith("tool:change", TOOL.EYEDROPPER);
  });

  it("renders the fill and stroke color swatches", () => {
    const eventBus = new EventBus();

    render(
      <EventBusProvider eventBus={eventBus}>
        <ToolMenu />
      </EventBusProvider>
    );

    expect(screen.getByLabelText("Cor de preenchimento")).toBeInTheDocument();
    expect(screen.getByLabelText("Cor de contorno")).toBeInTheDocument();
  });
});

