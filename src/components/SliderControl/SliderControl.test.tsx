import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
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

/** Variante controlada, para observar o campo refletindo o valor aplicado. */
const setupControlled = () => {
  const onChange = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState(50);
    return (
      <SliderControl
        id="control"
        label="Opacidade"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    );
  };

  render(<Harness />);

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

  it("aceita apagar o campo e digitar por substituição", () => {
    const { onChange } = setup();
    const input = screen.getByLabelText("Opacidade:");

    fireEvent.change(input, { target: { value: "" } });

    expect(input).toHaveValue(null);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "7" } });

    expect(onChange).toHaveBeenLastCalledWith(7);
    expect(input).toHaveValue(7);
  });

  it("restaura o valor atual quando o campo vazio perde o foco", () => {
    setup();
    const input = screen.getByLabelText("Opacidade:");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(input).toHaveValue(50);
  });

  it("aplica o limite ao sair do campo com valor fora da faixa", () => {
    const { onChange } = setupControlled();
    const input = screen.getByLabelText("Opacidade:");

    fireEvent.change(input, { target: { value: "180" } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenLastCalledWith(100);
    expect(input).toHaveValue(100);
  });

  it("Escape descarta o texto em edição", () => {
    const { onChange } = setup();
    const input = screen.getByLabelText("Opacidade:");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).toHaveValue(50);
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
