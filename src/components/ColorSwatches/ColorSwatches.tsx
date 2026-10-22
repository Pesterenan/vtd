import { useEffect, useState } from "react";
import ColorPicker from "../ColorPicker/ColorPicker";
import { useActiveColors } from "src/hooks/useActiveColors";
import styles from "./ColorSwatches.module.css";

import SwapIcon from "src/assets/icons/swap-colors.svg";

const ColorSwatches = () => {
  const { fillColor, strokeColor, setFillColor, setStrokeColor, swapColors } =
    useActiveColors();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const togglePopover = () => setIsOpen((open) => !open);

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
            style={{ "--icon-url": `url("${SwapIcon}")` } as React.CSSProperties}
          />
        </button>
        <button
          type="button"
          className={`${styles.swatch} ${styles.stroke}`}
          style={{ backgroundColor: strokeColor }}
          aria-label="Cor de contorno"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={togglePopover}
        />
        <button
          type="button"
          className={`${styles.swatch} ${styles.fill}`}
          style={{ backgroundColor: fillColor }}
          aria-label="Cor de preenchimento"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={togglePopover}
        />
      </div>

      {isOpen && (
        <>
          <div
            className={styles.backdrop}
            onClick={() => setIsOpen(false)}
            data-testid="color-swatches-backdrop"
          />
          <div
            className={styles.popover}
            role="dialog"
            aria-label="Cores de preenchimento e contorno"
          >
            <ColorPicker
              id={"tool-fill-color"}
              label={"Preenchimento"}
              value={fillColor}
              onChange={setFillColor}
            />
            <ColorPicker
              id={"tool-stroke-color"}
              label={"Contorno"}
              value={strokeColor}
              onChange={setStrokeColor}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ColorSwatches;
