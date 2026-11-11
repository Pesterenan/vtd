import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveColors } from "src/hooks/useActiveColors";
import { useEventBus } from "src/hooks/useEventBus";
import { hexToHsl } from "src/utils/color";
import type { ColorSlot } from "src/utils/color";
import {
  UPWARD_TRIANGLE,
  barycentricWeights,
  hexFromWeights,
  paintTriangle,
  pointFromWeights,
  triangleForHue,
  weightsFromHex,
} from "src/utils/colorTriangle";
import { remap } from "src/utils/easing";
import { WHEEL_SIZE, hueToPoint, pointToHue, rotatePoint } from "src/utils/wheel";
import type { Position } from "../types";

import styles from "./WheelColorPicker.module.css";

const HUE_BAR_WIDTH = 160;

type PickerState = {
  isOpen: boolean;
  activeColor: string;
  slot: ColorSlot;
  hue: number;
};

const hueOf = (hex: string): number => hexToHsl(hex).h;

const WheelColorPicker = () => {
  const { fillColor, strokeColor, setFillColor, setStrokeColor } =
    useActiveColors();
  const { on } = useEventBus();
  const [state, setState] = useState<PickerState>(() => ({
    isOpen: false,
    activeColor: fillColor,
    slot: "fill",
    hue: hueOf(fillColor),
  }));
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const unsubscribePicker = on(
      "wheelColorPicker",
      ({ isOpen, activeColor, slot }) => {
        setState({ isOpen, activeColor, slot, hue: hueOf(activeColor) });
      },
    );
    const unsubscribeUnequipped = on("tool:unequipped", () => {
      setState((prev) => ({ ...prev, isOpen: false }));
    });

    return () => {
      unsubscribePicker();
      unsubscribeUnequipped();
    };
  }, [on]);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    paintTriangle(context, state.hue);
  }, [state.hue, state.isOpen]);

  const triangle = useMemo(() => triangleForHue(state.hue), [state.hue]);
  const ringPoint = useMemo(() => hueToPoint(state.hue), [state.hue]);
  const trianglePoint = useMemo(
    () => pointFromWeights(weightsFromHex(state.activeColor), triangle),
    [state.activeColor, triangle],
  );

  /**
   * Arrasto no seletor: o modo (anel ou triângulo) é decidido no `mousedown`
   * e mantido até soltar. Os pesos da cor ativa são capturados no início para
   * que o anel altere só o hue e o triângulo só saturação/luminosidade.
   */
  const handleWheelMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const toPoint = (clientX: number, clientY: number): Position => ({
      x: ((clientX - rect.left) / rect.width) * WHEEL_SIZE,
      y: ((clientY - rect.top) / rect.height) * WHEEL_SIZE,
    });

    const setColor = state.slot === "fill" ? setFillColor : setStrokeColor;
    const { hue } = state;
    const startWeights = weightsFromHex(state.activeColor);
    const startPoint = toPoint(event.clientX, event.clientY);
    const dragsTriangle =
      barycentricWeights(rotatePoint(startPoint, -hue), UPWARD_TRIANGLE) !==
      null;

    const update = (clientX: number, clientY: number) => {
      const point = toPoint(clientX, clientY);

      if (dragsTriangle) {
        const weights = barycentricWeights(
          rotatePoint(point, -hue),
          UPWARD_TRIANGLE,
        );
        if (!weights) return;
        const hex = hexFromWeights(hue, weights);
        setColor(hex);
        setState((prev) => ({ ...prev, activeColor: hex }));
        return;
      }

      const nextHue = pointToHue(point);
      const hex = hexFromWeights(nextHue, startWeights);
      setColor(hex);
      setState((prev) => ({ ...prev, activeColor: hex, hue: nextHue }));
    };

    update(event.clientX, event.clientY);

    const handleMove = (moveEvent: MouseEvent) => {
      update(moveEvent.clientX, moveEvent.clientY);
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const selectSlot = (slot: ColorSlot, color: string) => {
    setState((prev) => ({
      ...prev,
      slot,
      activeColor: color,
      hue: hueOf(color),
    }));
  };

  if (!state.isOpen) return null;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", zIndex: 1100 }}>
        <div className={styles.wheelContainer}>
          <div
            className={styles.wheel}
            data-testid="wheel-color-picker"
            onMouseDown={handleWheelMouseDown}
          />
          <canvas
            ref={canvasRef}
            className={styles.triangle}
            width={WHEEL_SIZE}
            height={WHEEL_SIZE}
            style={{ transform: `rotate(${state.hue}deg)` }}
          />
          <svg
            viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
            className={styles.overlay}
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              data-testid="wheel-color-picker-hue-indicator"
              cx={ringPoint.x}
              cy={ringPoint.y}
              r={7}
              fill="none"
              stroke="white"
              strokeWidth={2}
              style={{ filter: "drop-shadow(0 0 1px #000)" }}
            />
            <circle
              data-testid="wheel-color-picker-color-indicator"
              cx={trianglePoint.x}
              cy={trianglePoint.y}
              r={6}
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
              position: "absolute",
              top: 0,
              left: remap(0, 360, 0, HUE_BAR_WIDTH, state.hue, true),
            }}
          >
            |
          </div>
        </div>
        <div
          onClick={() => selectSlot("fill", fillColor)}
          style={{ backgroundColor: fillColor, width: "2rem", height: "2rem" }}
        >
          FILL
        </div>
        <div
          onClick={() => selectSlot("stroke", strokeColor)}
          style={{ backgroundColor: strokeColor, width: "2rem", height: "2rem" }}
        >
          STROKE
        </div>
      </div>
    </div>
  );
};

export default WheelColorPicker;
