import BaseFilterControls from "./BaseFilterControls";
import SliderControl from "src/components/SliderControl/SliderControl";
import ColorPicker from "src/components/ColorPicker/ColorPicker";
import type { FilterProperties } from "src/filters/filter";

interface DropShadowControlsProps {
  filterId: string;
  properties: FilterProperties;
  onChange: (updates: Partial<FilterProperties>) => void;
}

const DropShadowControls = ({ filterId, properties, onChange }: DropShadowControlsProps) => {
  return (
    <BaseFilterControls
      filterId={filterId}
      composite={properties.composite as string}
      globalAlpha={properties.globalAlpha as number}
      onCompositeChange={(v) => onChange({ composite: v })}
      onAlphaChange={(v) => onChange({ globalAlpha: v })}
    >
      <SliderControl
        id={`${filterId}-angle`}
        label="Ângulo"
        min={0} max={360} step={1}
        value={properties.angle as number}
        onChange={(v) => onChange({ angle: v })}
        includeSlider
      />
      <SliderControl
        id={`${filterId}-distance`}
        label="Distância"
        min={0} max={100} step={1}
        value={properties.distance as number}
        onChange={(v) => onChange({ distance: v })}
        includeSlider
      />
      <SliderControl
        id={`${filterId}-blur`}
        label="Desfoque"
        min={0} max={100} step={1}
        value={properties.blur as number}
        onChange={(v) => onChange({ blur: v })}
        includeSlider
      />
      <ColorPicker
        id={`${filterId}-color`}
        label="Cor da Sombra"
        value={properties.color as string}
        onChange={(v) => onChange({ color: v })}
      />
    </BaseFilterControls>
  );
};

export default DropShadowControls;
