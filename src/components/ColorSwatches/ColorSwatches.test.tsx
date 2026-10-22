import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import { PathElement } from "src/components/elements/pathElement";
import { activeColors, DEFAULT_ACTIVE_COLORS } from "src/utils/color";
import ColorSwatches from "./ColorSwatches";

const renderSwatches = () => {
  const eventBus = new EventBus();
  render(
    <EventBusProvider eventBus={eventBus}>
      <ColorSwatches />
    </EventBusProvider>,
  );
  return eventBus;
};

const selectPath = (eventBus: EventBus, path: PathElement) => {
  act(() => {
    eventBus.emit("selection:changed", { selectedElements: [path] });
  });
};

describe("ColorSwatches", () => {
  beforeEach(() => {
    activeColors.reset();
  });

  it("mostra as cores ativas nos swatches", () => {
    renderSwatches();

    expect(screen.getByLabelText("Cor de preenchimento")).toHaveStyle({
      backgroundColor: DEFAULT_ACTIVE_COLORS.fill,
    });
    expect(screen.getByLabelText("Cor de contorno")).toHaveStyle({
      backgroundColor: DEFAULT_ACTIVE_COLORS.stroke,
    });
  });

  it("espelha as cores do elemento selecionado", () => {
    const eventBus = renderSwatches();
    const path = new PathElement(
      { x: 0, y: 0 },
      { width: 10, height: 10 },
      1,
    );
    path.fillColor = "#ff0000";
    path.strokeColor = "#00ff00";

    selectPath(eventBus, path);

    expect(screen.getByLabelText("Cor de preenchimento")).toHaveStyle({
      backgroundColor: "#ff0000",
    });
    expect(screen.getByLabelText("Cor de contorno")).toHaveStyle({
      backgroundColor: "#00ff00",
    });
  });

  it("troca as cores ao clicar no botão de swap", () => {
    const eventBus = renderSwatches();
    const path = new PathElement(
      { x: 0, y: 0 },
      { width: 10, height: 10 },
      1,
    );
    path.fillColor = "#ff0000";
    path.strokeColor = "#00ff00";
    selectPath(eventBus, path);

    fireEvent.click(
      screen.getByLabelText("Trocar preenchimento e contorno"),
    );

    expect(screen.getByLabelText("Cor de preenchimento")).toHaveStyle({
      backgroundColor: "#00ff00",
    });
    expect(screen.getByLabelText("Cor de contorno")).toHaveStyle({
      backgroundColor: "#ff0000",
    });
    expect(path.fillColor).toBe("#00ff00");
    expect(path.strokeColor).toBe("#ff0000");
  });

  it("abre o popover com os dois seletores de cor", () => {
    renderSwatches();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Cor de preenchimento"));

    expect(
      screen.getByRole("dialog", {
        name: "Cores de preenchimento e contorno",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Preenchimento:")).toBeInTheDocument();
    expect(screen.getByLabelText("Contorno:")).toBeInTheDocument();
  });

  it("aplica a cor escolhida no elemento selecionado", () => {
    const eventBus = renderSwatches();
    const path = new PathElement(
      { x: 0, y: 0 },
      { width: 10, height: 10 },
      1,
    );
    selectPath(eventBus, path);

    fireEvent.click(screen.getByLabelText("Cor de preenchimento"));
    fireEvent.change(screen.getByLabelText("Preenchimento:"), {
      target: { value: "#123456" },
    });

    expect(path.fillColor).toBe("#123456");
    expect(activeColors.get().fill).toBe("#123456");
  });

  it("fecha o popover ao clicar no backdrop", () => {
    renderSwatches();
    fireEvent.click(screen.getByLabelText("Cor de contorno"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("color-swatches-backdrop"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fecha o popover com Escape", () => {
    renderSwatches();
    fireEvent.click(screen.getByLabelText("Cor de preenchimento"));

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
