import type { FilterProperties } from "src/filters/filter";
import DropShadowControls from "./DropShadowControls";
import OuterGlowControls from "./OuterGlowControls";
import ColorCorrectionControls from "./ColorCorrectionControls";

interface FilterControlsProps {
  filterId: string;
  properties: FilterProperties;
  onChange: (updates: Partial<FilterProperties>) => void;
}

const controlMap: Record<string, React.FC<FilterControlsProps>> = {
  "drop-shadow": DropShadowControls,
  "outer-glow": OuterGlowControls,
  "color-correction": ColorCorrectionControls,
};

const FilterControls = ({ filterId, properties, onChange }: FilterControlsProps) => {
  const Component = controlMap[filterId];
  if (!Component) return null;
  return <Component filterId={filterId} properties={properties} onChange={onChange} />;
};

export default FilterControls;
