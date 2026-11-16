import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import SliderControl from "./SliderControl";

const setup = (props: Partial<ComponentProps<typeof SliderControl>> = {}) => {
  const onChange = vi.fn();

  render(
    <SliderControl
      id="control"
      label="Opacidade"
      min={0}
      max={100}
      step={1}
      value={50}
      onChange={onChange}
      {...props}
    />,
  );

  return { onChange };
};

describe("SliderControl", () => {
  it("mostra o rótulo com dois-pontos e o valor atual", () => {
    setup();

    expect(screen.getByText("Opacidade:")).toBeInTheDocument();
    expect(screen.getByLabelText("Opacidade:")).toHaveValue(50);
  });

  it("no modo compacto dispensa os dois-pontos e mostra o sufixo", () => {
    setup({ compact: true, suffix: "%" });

    expect(screen.getByText("Opacidade")).toBeInTheDocument();
    expect(screen.getByText("%")).toBeInTheDocument();
    expect(screen.getByLabelText("Opacidade")).toHaveValue(50);
  });

  it("não mostra sufixo quando não é informado", () => {
    setup();

    expect(screen.queryByText("%")).toBeNull();
  });

  it("colar um valor com sufixo aproveita o número", () => {
    const { onChange } = setup({ suffix: "%" });

    fireEvent.paste(screen.getByLabelText("Opacidade:"), {
      clipboardData: { getData: () => "42%" },
    });

    expect(onChange).toHaveBeenLastCalledWith(42);
  });

  it("colar um valor com sufixo respeita os limites", () => {
    const { onChange } = setup({ suffix: "%" });

    fireEvent.paste(screen.getByLabelText("Opacidade:"), {
      clipboardData: { getData: () => "180%" },
    });

    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it("colar um número sem sufixo não interfere", () => {
    const { onChange } = setup({ suffix: "%" });

    fireEvent.paste(screen.getByLabelText("Opacidade:"), {
      clipboardData: { getData: () => "42" },
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("digitar um valor fora da faixa aplica o limite", () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText("Opacidade:"), {
      target: { value: "180" },
    });

    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it("campo vazio enquanto digita não vira zero", () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText("Opacidade:"), {
      target: { value: "" },
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("arrastar o rótulo ajusta o valor pela distância horizontal", () => {
    const { onChange } = setup();

    fireEvent.mouseDown(screen.getByText("Opacidade:"), { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 1000 });
    fireEvent.mouseUp(window);

    // sensitivity 2000px para a faixa 0-100: 1000px = 50 unidades.
    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it("não arrasta quando desabilitado", () => {
    const { onChange } = setup({ disabled: true });

    fireEvent.mouseDown(screen.getByText("Opacidade:"), { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 1000 });
    fireEvent.mouseUp(window);

    expect(onChange).not.toHaveBeenCalled();
  });
});
