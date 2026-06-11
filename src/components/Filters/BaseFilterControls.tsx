import type { ReactNode } from "react";
import SelectInput from "src/components/SelectInput/SelectInput";
import SliderControl from "src/components/SliderControl/SliderControl";
import type { ISelectOption } from "src/components/SelectInput/SelectInput";

export const COMPOSITE_OPTIONS: Array<ISelectOption> = [
  { label: "Normal", value: "source-over" },
  { label: "Clarear", value: "lighten" },
  { label: "Cor", value: "color" },
  { label: "Diferença", value: "difference" },
  { label: "Escape de Cor", value: "color-dodge" },
  { label: "Escurecer", value: "darken" },
  { label: "Exclusão", value: "exclusion" },
  { label: "Luminosidade", value: "luminosity" },
  { label: "Luz Forte", value: "hard-light" },
  { label: "Luz Suave", value: "soft-light" },
  { label: "Mais Claro", value: "lighter" },
  { label: "Matiz", value: "hue" },
  { label: "Multiplicação", value: "multiply" },
  { label: "Queima de Cor", value: "color-burn" },
  { label: "Saturação", value: "saturation" },
  { label: "Sobreposição", value: "overlay" },
  { label: "Tela", value: "screen" },
] as const;

interface BaseFilterControlsProps {
  filterId: string;
  composite: string;
  globalAlpha: number;
  onCompositeChange: (value: string) => void;
  onAlphaChange: (value: number) => void;
  children: ReactNode;
}

const BaseFilterControls = ({
  filterId,
  composite,
  globalAlpha,
  onCompositeChange,
  onAlphaChange,
  children,
}: BaseFilterControlsProps) => {
  return (
    <div className="sec_menu-style pad-05" id={`${filterId}-filter-controls`}>
      <SelectInput
        id={`${filterId}-composite-select`}
        label="Composição"
        options={COMPOSITE_OPTIONS}
        value={composite}
        onChange={onCompositeChange}
      />
      <SliderControl
        id={`${filterId}-opacity`}
        label="Opacidade"
        min={0}
        max={1}
        step={0.01}
        value={globalAlpha}
        onChange={onAlphaChange}
      />
      {children}
    </div>
  );
};

export default BaseFilterControls;
