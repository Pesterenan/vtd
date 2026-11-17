import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import { PathElement } from "src/components/elements/pathElement";
import { activeColors, DEFAULT_ACTIVE_COLORS } from "src/utils/color";
import ColorSwatches from "./ColorSwatches";

type OpenPayload = {
  anchor: HTMLElement;
  color: string;
  onChange: (color: string) => void;
};

const renderSwatches = () => {
  const eventBus = new EventBus();
  const opens: OpenPayload[] = [];
  eventBus.on("colorPicker:open", (payload) => {
    opens.push(payload);
  });

  render(
    <EventBusProvider eventBus={eventBus}>
      <ColorSwatches />
    </EventBusProvider>,
  );

  return { eventBus, opens };
};

const selectPath = (eventBus: EventBus, path: PathElement) => {
  act(() => {
    eventBus.emit("selection:changed", { selectedElements: [path] });
  });
};

const createPath = () => {
  const path = new PathElement({ x: 0, y: 0 }, { width: 10, height: 10 }, 1);
  path.fillColor = "#ff0000";
  path.strokeColor = "#00ff00";
  return path;
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
    const { eventBus } = renderSwatches();
    const path = createPath();

    selectPath(eventBus, path);

    expect(screen.getByLabelText("Cor de preenchimento")).toHaveStyle({
      backgroundColor: "#ff0000",
    });
    expect(screen.getByLabelText("Cor de contorno")).toHaveStyle({
      backgroundColor: "#00ff00",
    });
  });

  it("troca as cores ao clicar no botão de swap", () => {
    const { eventBus } = renderSwatches();
    const path = createPath();
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

  it("pede o color picker ancorado no swatch de preenchimento", () => {
    const { opens } = renderSwatches();
    const fillSwatch = screen.getByLabelText("Cor de preenchimento");

    fireEvent.click(fillSwatch);

    expect(opens).toHaveLength(1);
    expect(opens[0].anchor).toBe(fillSwatch);
    expect(opens[0].color).toBe(DEFAULT_ACTIVE_COLORS.fill);
  });

  it("pede o color picker ancorado no swatch de contorno", () => {
    const { opens } = renderSwatches();
    const strokeSwatch = screen.getByLabelText("Cor de contorno");

    fireEvent.click(strokeSwatch);

    expect(opens).toHaveLength(1);
    expect(opens[0].anchor).toBe(strokeSwatch);
    expect(opens[0].color).toBe(DEFAULT_ACTIVE_COLORS.stroke);
  });

  it("aplica a cor escolhida no elemento selecionado", () => {
    const { eventBus, opens } = renderSwatches();
    const path = createPath();
    selectPath(eventBus, path);

    fireEvent.click(screen.getByLabelText("Cor de preenchimento"));
    act(() => opens[0].onChange("#123456"));

    expect(path.fillColor).toBe("#123456");
    expect(activeColors.get().fill).toBe("#123456");
    expect(screen.getByLabelText("Cor de preenchimento")).toHaveStyle({
      backgroundColor: "#123456",
    });
  });

  it("aplica a cor escolhida ao contorno do elemento selecionado", () => {
    const { eventBus, opens } = renderSwatches();
    const path = createPath();
    selectPath(eventBus, path);

    fireEvent.click(screen.getByLabelText("Cor de contorno"));
    act(() => opens[0].onChange("#abcdef"));

    expect(path.strokeColor).toBe("#abcdef");
    expect(activeColors.get().stroke).toBe("#abcdef");
  });
});
