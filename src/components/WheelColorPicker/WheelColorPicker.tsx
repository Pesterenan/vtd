import { SVGProps, useEffect, useState } from "react";
import { useActiveColors } from "src/hooks/useActiveColors";
import { useEventBus } from "src/hooks/useEventBus";
import { hexToHsl, hslToHex } from "src/utils/color";
import { clamp, linearInterpolation, remap } from "src/utils/easing";
import type { Position } from "../types";
import { toDegrees } from "src/utils/angles";

import styles from "./WheelColorPicker.module.css";
const WheelColorPicker = () => {
  const { fillColor, strokeColor, setFillColor, setStrokeColor, swapColors } =
    useActiveColors();
  const { on } = useEventBus();
  const [state, setState] = useState({ isOpen: false, activeColor: fillColor });
  const [indicator, setIndicator] = useState({ x: 10, y: 10 });

  useEffect(() => {
    const unsubEquipped = on("tool:equipped", () => {
      calculateIndicatorPosition({ x: 64.0, y: 8.0 });
    });
    const unsubUnequipped = on("tool:unequipped", () => {
      setState((prev) => ({ ...prev, isOpen: false }));
    });
    const unsubColorWheelState = on(
      "wheelColorPicker",
      ({ isOpen, activeColor }) => {
        setState({ isOpen, activeColor });
        calculateIndicatorPosition(activeColor);
      },
    );

    return () => {
      unsubEquipped();
      unsubUnequipped();
      unsubColorWheelState();
    };
  }, [on]);

  const calculateIndicatorPosition = (source: Position | string) => {
    const RING = 112;
    let hue = 0;
    if (typeof source === 'object') {
      const relPoint = { x: source.x - 128, y: source.y - 128 };
      hue = Math.atan2(relPoint.y, relPoint.x);
    } else {
      hue = hexToHsl(source).h;
    }

    const xfinal = RING * Math.cos(hue);
    const yfinal = RING * Math.sin(hue);

    setIndicator({ x: 128 + xfinal, y: 128 + yfinal });
  };

  const calculateHuePointer = () => {
    const width = 160;
    const HSL = hexToHsl(state.activeColor);
    const xPos = remap(0, 360, 0, width, HSL.h, true);
    return xPos;
  };
  const handleClickFillSlot = () => {
    setState((prev) => ({ ...prev, activeColor: fillColor }));
  };
  const handleClickStrokeSlot = () => {
    setState((prev) => ({ ...prev, activeColor: strokeColor }));
  };

  return state.isOpen ? (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", zIndex: 100 }}>
        <div
          className={styles.wheel}
          onMouseDown={() => {
            const mousemove = (event: MouseEvent) => {
              calculateIndicatorPosition({
                x: event.offsetX,
                y: event.offsetY,
              });
            };
            const mouseup = () => {
              console.log(hslToHex(hexToHsl(state.activeColor)));
              document.removeEventListener("mousemove", mousemove);
              document.removeEventListener("mouseup", mouseup);
            };
            document.addEventListener("mousemove", mousemove);
            document.addEventListener("mouseup", mouseup);
          }}
        ></div>
        <svg
          viewBox="0 0 256 256"
          className={styles.overlay}
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx={indicator.x}
            cy={indicator.y}
            r={7}
            fill="none"
            stroke="white"
            strokeWidth={2}
            style={{ filter: "drop-shadow(0 0 1px #000)" }}
          />
        </svg>
      </div>
      <div
        style={{
          background: `linear-gradient(to right, 
          hsl(0,   100%, 50%) 0%, 
          hsl(30,  100%, 50%) 8.333333%,
          hsl(60,  100%, 50%) 16.666667%,
          hsl(90,  100%, 50%) 25.0%,
          hsl(120, 100%, 50%) 33.333333%,
          hsl(150, 100%, 50%) 41.666667%,
          hsl(180, 100%, 50%) 50.0%,
          hsl(210, 100%, 50%) 58.333333%,
          hsl(240, 100%, 50%) 66.666667%,
          hsl(270, 100%, 50%) 75.0%,
          hsl(300, 100%, 50%) 83.333333%,
          hsl(330, 100%, 50%) 91.666667%,
          hsl(360, 100%, 50%) 100.0%
          )`,
          height: "1rem",
          width: "10rem",
          position: "relative",
        }}
      >
        <div
          style={{
            cursor: "pointer",
            position: "absolute",
            top: 0,
            left: calculateHuePointer(),
          }}
        >
          |
        </div>
      </div>
      <div
        onClick={handleClickFillSlot}
        style={{ backgroundColor: fillColor, width: "2rem", height: "2rem" }}
      >
        FILL
      </div>
      <div
        onClick={handleClickStrokeSlot}
        style={{ backgroundColor: strokeColor, width: "2rem", height: "2rem" }}
      >
        STROKE
      </div>
      {Object.entries(state)
        .map(
          ([k, v]) => `${k}: ${typeof v === "object" ? Object.values(v) : v}`,
        )
        .join(" - ")}
    </div>
  ) : null;
};

export default WheelColorPicker;
