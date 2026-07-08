import { forwardRef } from "react";
import styles from "./CanvasShell.module.css";

const CanvasShell = forwardRef<HTMLCanvasElement>((_props, ref) => {
  return (
    <div id="canvas-container" className={styles.canvasShell}>
      <canvas ref={ref} id="main-canvas" className={styles.mainCanvas} />
    </div>
  );
});

export default CanvasShell;
