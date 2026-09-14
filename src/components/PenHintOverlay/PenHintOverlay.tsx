import { useEffect, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import styles from "./PenHintOverlay.module.css";

interface PenHintPayload {
  visible: boolean;
}

const PenHintOverlay = () => {
  const { on } = useEventBus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsub = on("pen:hint", ({ visible }: PenHintPayload) => {
      setVisible(visible);
    });
    return () => unsub();
  }, [on]);

  if (!visible) return null;

  return (
    <div
      className={styles.hint}
      role="status"
      aria-label="Atalhos da ferramenta caneta"
    >
      Enter: fechar · Esc: cancelar · Shift: alinhar
    </div>
  );
};

export default PenHintOverlay;