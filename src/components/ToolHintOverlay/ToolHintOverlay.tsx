import { useEffect, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import styles from "./ToolHintOverlay.module.css";
import type { ToolHintPayload } from "src/utils/eventBus";

const ToolHintOverlay = () => {
  const { on } = useEventBus();
  const [state, setState] = useState<ToolHintPayload>({  hintText: '' });

  useEffect(() => {
    const unsubHint = on("tool:hint", (payload: ToolHintPayload) => {
      setState(payload);
    });
    // Fallback para tools que não emitem hide ao sair.
    const unsubUnequipped = on("tool:unequipped", () => {
      setState({ hintText: "" });
    });
    return () => {
      unsubHint();
      unsubUnequipped();
    };
  }, [on]);

  if (!state.hintText) return null;

  return (
    <div
      className={styles.hint}
      role="status"
      aria-label="Atalhos da ferramenta ativa"
    >
      {state.hintText}
    </div>
  );
};

export default ToolHintOverlay;
