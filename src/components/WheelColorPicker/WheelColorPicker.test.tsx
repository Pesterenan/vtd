import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import { activeColors, hslToHex } from "src/utils/color";
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

const setup = (color: string, anchorEl?: HTMLElement) => {
  const eventBus = new EventBus();
  const onChange = vi.fn();
  const anchor = anchorEl ?? document.createElement("div");

  render(
    <EventBusProvider eventBus={eventBus}>
      <WheelColorPicker />
    </EventBusProvider>,
  );

  act(() => {
    eventBus.emit("colorPicker:open", { anchor, color, onChange });
  });

  return { eventBus, onChange, anchor };
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
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <WheelColorPicker />
      </EventBusProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("abre o painel ancorado e posiciona os indicadores na cor ativa", () => {
    setup("#ff0000");

    expect(
      screen.getByRole("dialog", { name: "Seletor de cores" }),
    ).toBeInTheDocument();

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

  it("escolher o hue no anel emite a cor correspondente", () => {
    const { onChange } = setup("#ff0000");

    // (240, 128) fica à direita do centro: hue 90.
    fireEvent.mouseDown(getWheel(), { clientX: 240, clientY: 128 });
    fireEvent.mouseUp(document);

    expect(onChange).toHaveBeenLastCalledWith("#80ff00");
  });

  it("escolher no centro do triângulo mistura cor pura, branco e preto", () => {
    const { onChange } = setup("#ff0000");

    // Centro do triângulo (hue 0): 1/3 de cada vértice.
    fireEvent.mouseDown(getWheel(), { clientX: 128, clientY: 128 });
    fireEvent.mouseUp(document);

    expect(onChange).toHaveBeenLastCalledWith("#aa5555");
  });

  it("mostra o swatch e os valores HSL da cor escolhida", () => {
    setup("#336699");

    expect(screen.getByTestId("color-picker-swatch")).toHaveStyle({
      backgroundColor: "#336699",
    });
    expect(screen.getByLabelText("H")).toHaveValue(210);
    expect(screen.getByLabelText("S")).toHaveValue(50);
    expect(screen.getByLabelText("L")).toHaveValue(40);
  });

  it("mostra as unidades nos campos HSL", () => {
    setup("#336699");

    expect(screen.getByText("°")).toBeInTheDocument();
    expect(screen.getAllByText("%")).toHaveLength(2);
  });

  it("o swatch é o próprio botão do conta-gotas", () => {
    setup("#336699");

    const swatch = screen.getByTestId("color-picker-swatch");
    expect(swatch.tagName).toBe("BUTTON");

    fireEvent.click(swatch);

    expect(screen.getByTestId("color-sampling-overlay")).toBeInTheDocument();
  });

  it("arrastar o rótulo H gira a roda", () => {
    const { onChange } = setup("#ff0000");

    fireEvent.mouseDown(screen.getByText("H"), { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 200 });
    fireEvent.mouseUp(window);

    // 200px de arrasto sobre a faixa 0-360 = +36°.
    expect(onChange).toHaveBeenLastCalledWith("#ff9900");
    expect(screen.getByLabelText("H")).toHaveValue(36);
  });

  it("editar a saturação no input emite a nova cor e atualiza o swatch", () => {
    const { onChange } = setup("#336699");

    fireEvent.change(screen.getByLabelText("S"), { target: { value: "100" } });

    expect(onChange).toHaveBeenLastCalledWith("#0066cc");
    expect(screen.getByTestId("color-picker-swatch")).toHaveStyle({
      backgroundColor: "#0066cc",
    });
  });

  it("preserva H e S ao passar por L=100 e voltar", () => {
    const { onChange } = setup("#336699");

    fireEvent.change(screen.getByLabelText("L"), { target: { value: "100" } });
    expect(onChange).toHaveBeenLastCalledWith("#ffffff");
    expect(screen.getByLabelText("S")).toHaveValue(50);

    fireEvent.change(screen.getByLabelText("L"), { target: { value: "40" } });

    expect(onChange).toHaveBeenLastCalledWith("#336699");
    expect(screen.getByLabelText("H")).toHaveValue(210);
    expect(screen.getByLabelText("S")).toHaveValue(50);
  });

  it("preserva o matiz ao zerar a saturação e voltar", () => {
    const { onChange } = setup("#336699");

    fireEvent.change(screen.getByLabelText("S"), { target: { value: "0" } });
    expect(onChange).toHaveBeenLastCalledWith("#666666");

    fireEvent.change(screen.getByLabelText("S"), { target: { value: "50" } });

    expect(onChange).toHaveBeenLastCalledWith("#336699");
    expect(screen.getByLabelText("H")).toHaveValue(210);
  });

  it("fecha com Escape", () => {
    setup("#ff0000");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("fecha ao clicar fora do painel e da âncora", () => {
    setup("#ff0000");

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  describe("captura de cor do canvas", () => {
    const openSampling = (sample: (x: number, y: number) => string | null) => {
      const harness = setup("#ff0000");
      const sampleSpy = vi.fn(
        ({ clientX, clientY }: { clientX: number; clientY: number }) =>
          sample(clientX, clientY),
      );
      harness.eventBus.on("workarea:sampleColor", sampleSpy);

      fireEvent.click(screen.getByLabelText("Capturar cor do canvas"));

      return { ...harness, sampleSpy };
    };

    const getOverlay = () => screen.getByTestId("color-sampling-overlay");
    const getDialog = () => screen.getByLabelText("Seletor de cores");

    it("entra em modo de captura e esconde o painel", () => {
      openSampling(() => "#123456");

      expect(getOverlay()).toBeInTheDocument();
      expect(getDialog()).toHaveStyle({ visibility: "hidden" });
    });

    it("mostra a pré-visualização da cor sob o cursor", () => {
      const { sampleSpy } = openSampling((x, y) =>
        x === 40 && y === 50 ? "#123456" : null,
      );

      fireEvent.mouseMove(getOverlay(), { clientX: 40, clientY: 50 });

      expect(sampleSpy).toHaveBeenCalledWith({ clientX: 40, clientY: 50 });
      expect(screen.getByTestId("color-sampling-preview")).toHaveStyle({
        backgroundColor: "#123456",
      });
    });

    it("clique confirma a cor capturada e reabre o painel", () => {
      const { onChange } = openSampling(() => "#123456");

      fireEvent.click(getOverlay(), { clientX: 40, clientY: 50 });

      expect(onChange).toHaveBeenLastCalledWith("#123456");
      expect(screen.getByTestId("color-picker-swatch")).toHaveStyle({
        backgroundColor: "#123456",
      });
      expect(screen.queryByTestId("color-sampling-overlay")).toBeNull();
      expect(
        screen.getByRole("dialog", { name: "Seletor de cores" }),
      ).toHaveStyle({ visibility: "visible" });
    });

    it("atualiza a roda e os valores HSL com a cor capturada", () => {
      openSampling(() => "#123456");

      fireEvent.click(getOverlay(), { clientX: 40, clientY: 50 });

      // #123456 = hsl(210, 65%, 20%)
      expect(screen.getByLabelText("H")).toHaveValue(210);
      expect(screen.getByLabelText("S")).toHaveValue(65);
      expect(screen.getByLabelText("L")).toHaveValue(20);

      const hueIndicator = screen.getByTestId(
        "wheel-color-picker-hue-indicator",
      );
      expect(Number(hueIndicator.getAttribute("cx"))).toBeCloseTo(72, 1);
      expect(Number(hueIndicator.getAttribute("cy"))).toBeCloseTo(225, 1);
    });

    it("mantém a captura quando o pixel não tem cor", () => {
      const { onChange } = openSampling(() => null);

      fireEvent.click(getOverlay(), { clientX: 40, clientY: 50 });

      expect(onChange).not.toHaveBeenCalled();
      expect(getOverlay()).toBeInTheDocument();
    });

    it("Escape cancela a captura sem fechar o painel", () => {
      openSampling(() => "#123456");

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByTestId("color-sampling-overlay")).toBeNull();
      expect(
        screen.getByRole("dialog", { name: "Seletor de cores" }),
      ).toBeInTheDocument();
    });

    it("clicar fora não fecha o painel durante a captura", () => {
      openSampling(() => "#123456");

      fireEvent.mouseDown(document.body);

      expect(getDialog()).toBeInTheDocument();
      expect(getOverlay()).toBeInTheDocument();
    });
  });

  it("cai no preenchimento padrão quando a cor não é #RRGGBB", () => {
    setup("red");

    expect(
      screen.getByRole("dialog", { name: "Seletor de cores" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("color-picker-swatch")).toHaveStyle({
      backgroundColor: "#E0E0E0",
    });
    expect(screen.getByLabelText("H")).toHaveValue(0);
    expect(screen.getByLabelText("S")).toHaveValue(0);
  });

  it("para de seguir o mouse quando o painel fecha durante o arrasto", () => {
    const { onChange } = setup("#ff0000");

    fireEvent.mouseDown(getWheel(), { clientX: 240, clientY: 128 });
    const callsAfterDown = onChange.mock.calls.length;

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.mouseMove(document, { clientX: 60, clientY: 60 });

    expect(onChange).toHaveBeenCalledTimes(callsAfterDown);
  });

  it("encerra o arrasto quando a janela perde o foco", () => {
    const { onChange } = setup("#ff0000");

    fireEvent.mouseDown(getWheel(), { clientX: 240, clientY: 128 });
    fireEvent.blur(window);
    const callsAfterBlur = onChange.mock.calls.length;

    fireEvent.mouseMove(document, { clientX: 60, clientY: 60 });

    expect(onChange).toHaveBeenCalledTimes(callsAfterBlur);
  });

  it("foca o painel ao abrir e devolve o foco à âncora ao fechar", () => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    setup("#ff0000", anchor);

    expect(
      screen.getByRole("dialog", { name: "Seletor de cores" }),
    ).toHaveFocus();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(anchor).toHaveFocus();
    anchor.remove();
  });

  it("setas ajustam o matiz com a roda focada", () => {
    const { onChange } = setup("#ff0000");
    const wheel = getWheel();

    expect(wheel).toHaveAttribute("aria-valuenow", "0");

    fireEvent.keyDown(wheel, { key: "ArrowRight" });

    expect(wheel).toHaveAttribute("aria-valuenow", "1");
    expect(onChange).toHaveBeenLastCalledWith(
      hslToHex({ h: 1, s: 100, l: 50 }),
    );

    fireEvent.keyDown(wheel, { key: "ArrowLeft", shiftKey: true });

    expect(wheel).toHaveAttribute("aria-valuenow", "351");
  });

  it("reaproveita a cor da nova âncora ao abrir de novo", () => {
    const { eventBus } = setup("#ff0000");
    const onChange = vi.fn();

    act(() => {
      eventBus.emit("colorPicker:open", {
        anchor: document.createElement("div"),
        color: "#336699",
        onChange,
      });
    });

    expect(screen.getByLabelText("H")).toHaveValue(210);
    expect(screen.getByTestId("color-picker-swatch")).toHaveStyle({
      backgroundColor: "#336699",
    });
  });
});
