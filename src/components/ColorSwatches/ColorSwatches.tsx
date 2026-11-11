import { useActiveColors } from "src/hooks/useActiveColors";
import { useEventBus } from "src/hooks/useEventBus";
import styles from "./ColorSwatches.module.css";

import SwapIcon from "src/assets/icons/swap-colors.svg";

const ColorSwatches = () => {
  const { fillColor, strokeColor, setFillColor, setStrokeColor, swapColors } =
    useActiveColors();
  const { emit } = useEventBus();

  return (
    <div className={styles.container}>
      <div className={styles.swatches}>
        <button
          type="button"
          className={styles.swapBtn}
          aria-label="Trocar preenchimento e contorno"
          title="Trocar preenchimento e contorno"
          onClick={swapColors}
        >
          <span
            className={styles.swapIcon}
            style={
              { "--icon-url": `url("${SwapIcon}")` } as React.CSSProperties
            }
          />
        </button>
        <button
          type="button"
          className={`${styles.swatch} ${styles.stroke}`}
          style={{ backgroundColor: strokeColor }}
          aria-label="Cor de contorno"
          aria-haspopup="dialog"
          onClick={(event) =>
            emit("colorPicker:open", {
              anchor: event.currentTarget,
              color: strokeColor,
              onChange: setStrokeColor,
            })
          }
        />
        <button
          type="button"
          className={`${styles.swatch} ${styles.fill}`}
          style={{ backgroundColor: fillColor }}
          aria-label="Cor de preenchimento"
          aria-haspopup="dialog"
          onClick={(event) =>
            emit("colorPicker:open", {
              anchor: event.currentTarget,
              color: fillColor,
              onChange: setFillColor,
            })
          }
        />
      </div>
    </div>
  );
};

export default ColorSwatches;
