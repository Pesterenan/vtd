import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import { activeColors } from "src/utils/color";
import WheelColorPicker from "./WheelColorPicker";

const RECT = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 256,
  bottom: 256,
  width: 256,
  height: 256,
  toJSON: () => ({}),
} as DOMRect;

const renderPicker = () => {
  const eventBus = new EventBus();
  render(
    <EventBusProvider eventBus={eventBus}>
      <WheelColorPicker />
    </EventBusProvider>,
  );
  return eventBus;
};

const openPicker = (
  eventBus: EventBus,
  activeColor: string,
  slot: "fill" | "stroke" = "fill",
) => {
  act(() => {
    eventBus.emit("wheelColorPicker", { isOpen: true, activeColor, slot });
  });
};

const getWheel = () => {
  const wheel = screen.getByTestId("wheel-color-picker");
  wheel.getBoundingClientRect = () => RECT;
  return wheel;
};

describe("WheelColorPicker", () => {
  beforeEach(() => {
    activeColors.reset();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não renderiza nada enquanto está fechado", () => {
    renderPicker();
    expect(screen.queryByTestId("wheel-color-picker")).toBeNull();
  });

  it("posiciona os indicadores na cor ativa ao abrir", () => {
    const eventBus = renderPicker();
    openPicker(eventBus, "#ff0000");

    const hueIndicator = screen.getByTestId(
      "wheel-color-picker-hue-indicator",
    );
    expect(hueIndicator).toHaveAttribute("cx", "128");
    expect(hueIndicator).toHaveAttribute("cy", "16");

    const colorIndicator = screen.getByTestId(
      "wheel-color-picker-color-indicator",
    );
    expect(colorIndicator).toHaveAttribute("cx", "128");
    expect(colorIndicator).toHaveAttribute("cy", "40");
  });

  it("escolher o hue no anel aplica a cor no slot ativo", () => {
    const eventBus = renderPicker();
    openPicker(eventBus, "#ff0000", "fill");

    // (240, 128) fica à direita do centro: hue 90.
    fireEvent.mouseDown(getWheel(), { clientX: 240, clientY: 128 });
    fireEvent.mouseUp(document);

    expect(activeColors.get().fill).toBe("#80ff00");
    expect(activeColors.get().stroke).toBe("#202020");
  });

  it("escolher no centro do triângulo mistura cor pura, branco e preto", () => {
    const eventBus = renderPicker();
    openPicker(eventBus, "#ff0000", "fill");

    // Centro do triângulo (hue 0): 1/3 de cada vértice.
    fireEvent.mouseDown(getWheel(), { clientX: 128, clientY: 128 });
    fireEvent.mouseUp(document);

    expect(activeColors.get().fill).toBe("#aa5555");
  });

  it("aplicar no slot de contorno não altera o preenchimento", () => {
    const eventBus = renderPicker();
    openPicker(eventBus, "#ff0000", "stroke");

    fireEvent.mouseDown(getWheel(), { clientX: 240, clientY: 128 });
    fireEvent.mouseUp(document);

    expect(activeColors.get().stroke).toBe("#80ff00");
    expect(activeColors.get().fill).toBe("#E0E0E0");
  });
});
