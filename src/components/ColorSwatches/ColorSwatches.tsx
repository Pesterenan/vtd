import { useEffect, useState } from "react";
import ColorPicker from "../ColorPicker/ColorPicker";
import { useActiveColors } from "src/hooks/useActiveColors";
import styles from "./ColorSwatches.module.css";

import SwapIcon from "src/assets/icons/swap-colors.svg";
import { useEventBus } from "src/hooks/useEventBus";
import type { ColorSlot } from "src/utils/color";

const ColorSwatches = () => {
  const { fillColor, strokeColor, setFillColor, setStrokeColor, swapColors } =
    useActiveColors();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<ColorSlot>("fill");
  const { emit } = useEventBus();

  const closePicker = () => {
    setIsOpen(false);
    emit("wheelColorPicker", {
      isOpen: false,
      activeColor: activeSlot === "fill" ? fillColor : strokeColor,
      slot: activeSlot,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePicker();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const openPicker = (slot: ColorSlot) => {
    const next = !isOpen;
    setActiveSlot(slot);
    setIsOpen(next);
    emit("wheelColorPicker", {
      isOpen: next,
      activeColor: slot === "fill" ? fillColor : strokeColor,
      slot,
    });
  };

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
          aria-expanded={isOpen}
          onClick={() => openPicker("stroke")}
        />
        <button
          type="button"
          className={`${styles.swatch} ${styles.fill}`}
          style={{ backgroundColor: fillColor }}
          aria-label="Cor de preenchimento"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => openPicker("fill")}
        />
      </div>

      {isOpen && (
        <>
          <div
            className={styles.backdrop}
            onClick={closePicker}
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
