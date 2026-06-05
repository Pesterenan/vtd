import { useEffect, useState } from "react";
import { useEventBus } from "../../hooks/useEventBus";
import { TOOL } from "../types";
import styles from "./ToolMenu.module.css";

import GradientIcon from "src/assets/icons/gradient-tool.svg";
import HandIcon from "src/assets/icons/hand-tool.svg";
import GrabIcon from "src/assets/icons/move-tool.svg";
import RotateIcon from "src/assets/icons/rotate-tool.svg";
import ScaleIcon from "src/assets/icons/scale-tool.svg";
import SelectIcon from "src/assets/icons/select-tool.svg";
import TextIcon from "src/assets/icons/text-tool.svg";
import ZoomIcon from "src/assets/icons/zoom-tool.svg";

const TOOLS = [
  { tool: TOOL.SELECT, label: "(V) Selecionar elementos" },
  { tool: TOOL.GRAB, label: "(G) Mover elementos" },
  { tool: TOOL.ROTATE, label: "(R) Rotacionar elementos" },
  { tool: TOOL.SCALE, label: "(S) Escalonar elementos" },
  { tool: TOOL.TEXT, label: "(T) Criar textos" },
  { tool: TOOL.GRADIENT, label: "(H) Criar gradientes" },
  { tool: TOOL.HAND, label: "(Espaço) Mover Área de Trabalho" },
  { tool: TOOL.ZOOM, label: "(Z) Modificar nível de zoom" },
] as const;

const toolIcons: Record<string, string> = {
  [TOOL.SELECT]: SelectIcon,
  [TOOL.GRAB]: GrabIcon,
  [TOOL.ROTATE]: RotateIcon,
  [TOOL.SCALE]: ScaleIcon,
  [TOOL.TEXT]: TextIcon,
  [TOOL.GRADIENT]: GradientIcon,
  [TOOL.HAND]: HandIcon,
  [TOOL.ZOOM]: ZoomIcon,
};

const ToolMenu = () => {
  const { emit, on } = useEventBus();
  const [activeTool, setActiveTool] = useState<TOOL>(TOOL.SELECT);

  useEffect(() => {
    const unsub = on("tool:change", (tool: TOOL) => setActiveTool(tool));
    return unsub;
  }, [on]);

  const handleToolClick = (tool: TOOL) => {
    emit("tool:change", tool);
  };

  return (
    <menu className={styles.toolMenu}>
      <label>Ferr.</label>
      {TOOLS.map(({ tool, label }) => (
        <button
          key={tool}
          data-tool={tool}
          className={`${styles.btn} ${activeTool === tool ? styles.active : ""}`}
          aria-label={label}
          onClick={() => handleToolClick(tool)}
        >
          <div
            className={styles.icon}
            style={{ "--icon-url": `url("${toolIcons[tool]}")` } as React.CSSProperties}
          />
        </button>
      ))}
    </menu>
  );
}

export default ToolMenu;
