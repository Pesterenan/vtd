import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  { tool: TOOL.MULTI, label: "(V) Selecionar, (G) Mover, (R) Rotacionar, (S) Escalonar" },
  { tool: TOOL.TEXT, label: "(T) Criar textos" },
  { tool: TOOL.GRADIENT, label: "(H) Criar gradientes" },
  { tool: TOOL.HAND, label: "(Espaço) Mover Área de Trabalho" },
  { tool: TOOL.ZOOM, label: "(Z) Modificar nível de zoom" },
] as const;

const toolIcons: Record<string, string> = {
  [TOOL.TEXT]: TextIcon,
  [TOOL.GRADIENT]: GradientIcon,
  [TOOL.HAND]: HandIcon,
  [TOOL.ZOOM]: ZoomIcon,
};

const modeLabels: Record<string, string> = {
  select: "(M) Selecionar elementos",
  move: "(M) Mover elementos",
  rotate: "(M) Rotacionar elementos",
  scale: "(M) Escalar elementos",
};

const modeIcons: Record<string, string> = {
  select: SelectIcon,
  move: GrabIcon,
  rotate: RotateIcon,
  scale: ScaleIcon,
};

const ToolMenu = () => {
  const { emit, on } = useEventBus();
  const [activeTool, setActiveTool] = useState<TOOL>(TOOL.MULTI);
  const [currentMode, setCurrentMode] = useState<
    "select" | "move" | "rotate" | "scale"
  >("select");

  useEffect(() => {
    const unsub = on("tool:change", (tool: TOOL) => setActiveTool(tool));
    return unsub;
  }, [on]);

  useEffect(() => {
    const unsub = on(
      "multiTool:modeChange",
      (mode: "select" | "move" | "rotate" | "scale") => setCurrentMode(mode),
    );
    return unsub;
  }, [on]);

  const handleToolClick = (tool: TOOL) => {
    emit("tool:change", tool);
  };

  const [theme, setTheme] = useState<"light" | "dark">(
    () =>
      (document.documentElement.dataset.theme as "light" | "dark") ?? "light",
  );

  const handleThemeToggle = useCallback(() => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    invoke("change_theme", { theme: next });
  }, [theme]);

  return (
    <menu className={styles.toolMenu}>
      <div className={styles.container}>
        <label>Ferr.</label>
        {TOOLS.map(({ tool, label }) => {
          const isMulti = tool === TOOL.MULTI;
          const resolvedLabel = isMulti ? modeLabels[currentMode] : label;
          const resolvedIcon = isMulti
            ? modeIcons[currentMode]
            : toolIcons[tool];

          return (
            <button
              key={tool}
              data-tool={tool}
              className={`${styles.btn} ${activeTool === tool ? styles.active : ""}`}
              aria-label={resolvedLabel}
              onClick={() => handleToolClick(tool)}
            >
              <div
                className={styles.icon}
                style={
                  {
                    "--icon-url": `url("${resolvedIcon}")`,
                  } as React.CSSProperties
                }
              />
            </button>
          );
        })}
        <button
          className={styles.btn}
          aria-label="Alternar tema claro/escuro"
          onClick={handleThemeToggle}
        >
          <div
            className={styles.icon}
            style={
              {
                "--icon-url": `url("data:image/svg+xml,${encodeURIComponent(
                  theme === "light"
                    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
                )}")`,
              } as React.CSSProperties
            }
          />
        </button>
      </div>
    </menu>
  );
};

export default ToolMenu;
