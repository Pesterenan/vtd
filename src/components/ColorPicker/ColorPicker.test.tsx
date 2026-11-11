import { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import ColorPicker from "./ColorPicker";

type OpenPayload = {
  anchor: HTMLElement;
  color: string;
  onChange: (color: string) => void;
};

const renderPicker = (
  props: Partial<React.ComponentProps<typeof ColorPicker>> = {},
) => {
  const eventBus = new EventBus();
  const opens: OpenPayload[] = [];
  eventBus.on("colorPicker:open", (payload) => {
    opens.push(payload);
  });

  const onChange = vi.fn();
  render(
    <EventBusProvider eventBus={eventBus}>
      <ColorPicker
        id="fill-color"
        label="Preenchimento"
        value="#336699"
        onChange={onChange}
        {...props}
      />
    </EventBusProvider>,
  );

  return { eventBus, onChange, opens };
};

const getInput = () =>
  document.getElementById("fill-color-color-input") as HTMLInputElement;

describe("ColorPicker", () => {
  it("renderiza o input nativo de cor com o valor recebido", () => {
    renderPicker();

    expect(screen.getByLabelText("Preenchimento:")).toBeInTheDocument();
    expect(getInput()).toHaveAttribute("type", "color");
    expect(getInput().value).toBe("#336699");
  });

  it("abre o color picker da aplicação ancorado no input", () => {
    const { opens } = renderPicker();

    fireEvent.click(getInput());

    expect(opens).toHaveLength(1);
    expect(opens[0].anchor).toBe(getInput());
    expect(opens[0].color).toBe("#336699");
  });

  it("impede o picker nativo ao clicar com o mouse", () => {
    renderPicker();

    const notPrevented = fireEvent.mouseDown(getInput());

    expect(notPrevented).toBe(false);
  });

  it("repassa a cor escolhida para o onChange", () => {
    const { onChange, opens } = renderPicker();

    fireEvent.click(getInput());
    act(() => opens[0].onChange("#123456"));

    expect(onChange).toHaveBeenCalledWith("#123456");
  });

  it("não abre quando está desabilitado", () => {
    const { opens } = renderPicker({ disabled: true });

    fireEvent.click(getInput());

    expect(opens).toHaveLength(0);
  });
});
