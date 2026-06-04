import { useRef } from "react";
import styles from "./CanvasShell.module.css";

const CanvasShell = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return <div ref={containerRef} className={styles.canvasShell} />;
};

export default CanvasShell;
