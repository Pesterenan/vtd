import { useRef } from "react";
import styles from "./CanvasShell.module.css";

export const CanvasShell = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return <div ref={containerRef} className={styles.canvasShell} />;
}
