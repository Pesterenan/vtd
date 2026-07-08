import BaseFilterControls from "./BaseFilterControls";
import SliderControl from "src/components/SliderControl/SliderControl";
import type { FilterProperties } from "src/filters/filter";

interface ColorCorrectionControlsProps {
  filterId: string;
  properties: FilterProperties;
  onChange: (updates: Partial<FilterProperties>) => void;
}

const ColorCorrectionControls = ({ filterId, properties, onChange }: ColorCorrectionControlsProps) => {
  return (
    <BaseFilterControls
      filterId={filterId}
      composite={properties.composite as string}
      globalAlpha={properties.globalAlpha as number}
      onCompositeChange={(v) => onChange({ composite: v })}
      onAlphaChange={(v) => onChange({ globalAlpha: v })}
    >
      <SliderControl
        id={`${filterId}-brightness`}
        label="Brilho"
        min={0} max={150} step={1}
        value={properties.brightness as number}
        onChange={(v) => onChange({ brightness: v })}
        includeSlider
      />
      <SliderControl
        id={`${filterId}-contrast`}
        label="Contraste"
        min={0} max={150} step={1}
        value={properties.contrast as number}
        onChange={(v) => onChange({ contrast: v })}
        includeSlider
      />
      <SliderControl
        id={`${filterId}-grayscale`}
        label="Escala de Cinza"
        min={0} max={100} step={1}
        value={properties.grayscale as number}
        onChange={(v) => onChange({ grayscale: v })}
        includeSlider
      />
      <SliderControl
        id={`${filterId}-hue`}
        label="Matiz"
        min={0} max={360} step={1}
        value={properties.hue as number}
        onChange={(v) => onChange({ hue: v })}
        includeSlider
      />
      <SliderControl
        id={`${filterId}-saturation`}
        label="Saturação"
        min={0} max={200} step={1}
        value={properties.saturation as number}
        onChange={(v) => onChange({ saturation: v })}
        includeSlider
      />
    </BaseFilterControls>
  );
};

export default ColorCorrectionControls;
