import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEventBus } from "src/hooks/useEventBus";
import { hexToHsl, hslToHex } from "src/utils/color";
import {
  UPWARD_TRIANGLE,
  barycentricWeights,
  hexFromWeights,
  paintTriangle,
  pointFromWeights,
  triangleForHue,
  weightsFromHex,
} from "src/utils/colorTriangle";
import { placeNearAnchor } from "src/utils/placement";
import { WHEEL_SIZE, hueToPoint, pointToHue, rotatePoint } from "src/utils/wheel";
import type { Position } from "../types";
import EyedropperIcon from "src/assets/icons/eyedropper-tool.svg";
import SliderControl from "../SliderControl/SliderControl";

import styles from "./WheelColorPicker.module.css";

type ColorPickerRequest = {
  anchor: HTMLElement;
  color: string;
  onChange: (color: string) => void;
};

type ColorPickerPanelProps = ColorPickerRequest & {
  onClose: () => void;
};

const hueOf = (hex: string): number => hexToHsl(hex).h;

type PickerState = {
  activeColor: string;
  hue: number;
  saturation: number;
  lightness: number;
};

const stateFromHex = (hex: string, hue = hueOf(hex)): PickerState => {
  const { s, l } = hexToHsl(hex);
  return { activeColor: hex, hue, saturation: s, lightness: l };
};

const ColorPickerPanel = ({
  anchor,
  color,
  onChange,
  onClose,
}: ColorPickerPanelProps) => {
  const { request } = useEventBus();
  const [state, setState] = useState<PickerState>(() => stateFromHex(color));
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [isSampling, setIsSampling] = useState(false);
  const [preview, setPreview] = useState<{
    x: number;
    y: number;
    color: string | null;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    setPosition(
      placeNearAnchor(
        anchor.getBoundingClientRect(),
        { width: rect.width, height: rect.height },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [anchor]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (isSampling) return;
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchor.contains(target)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isSampling) {
        setPreview(null);
        setIsSampling(false);
        return;
      }
      onClose();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchor, isSampling, onClose]);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    paintTriangle(context, state.hue);
  }, [state.hue]);

  const triangle = useMemo(() => triangleForHue(state.hue), [state.hue]);
  const ringPoint = useMemo(() => hueToPoint(state.hue), [state.hue]);
  const trianglePoint = useMemo(
    () => pointFromWeights(weightsFromHex(state.activeColor), triangle),
    [state.activeColor, triangle],
  );

  const { hue, saturation, lightness } = state;

  /** Cor vinda do hex (triângulo, anel, captura): o HSL acompanha o hex. */
  const commitHex = (hex: string) => {
    setState(stateFromHex(hex));
    onChange(hex);
  };

  /** Cor vinda dos sliders HSL: preserva H/S/L mesmo quando o hex satura. */
  const commitHsl = (next: { h: number; s: number; l: number }) => {
    const hex = hslToHex(next);
    setState({
      activeColor: hex,
      hue: next.h,
      saturation: next.s,
      lightness: next.l,
    });
    onChange(hex);
  };

  const sampleAt = (clientX: number, clientY: number): string | null =>
    request("workarea:sampleColor", { clientX, clientY })[0] ?? null;

  const startSampling = () => {
    setPreview(null);
    setIsSampling(true);
  };

  const cancelSampling = () => {
    setPreview(null);
    setIsSampling(false);
  };

  const handleSamplingMove = (event: React.MouseEvent<HTMLDivElement>) => {
    setPreview({
      x: event.clientX,
      y: event.clientY,
      color: sampleAt(event.clientX, event.clientY),
    });
  };

  const handleSamplingClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const sampled = sampleAt(event.clientX, event.clientY);
    if (!sampled) return;
    // O modo de captura também pode mudar o matiz: a roda precisa acompanhar.
    commitHex(sampled);
    cancelSampling();
  };

  const handleWheelMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const toPoint = (clientX: number, clientY: number): Position => ({
      x: ((clientX - rect.left) / rect.width) * WHEEL_SIZE,
      y: ((clientY - rect.top) / rect.height) * WHEEL_SIZE,
    });

    const { hue } = state;
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
        commitHex(hexFromWeights(hue, weights));
        return;
      }

      const nextHue = pointToHue(point);
      commitHsl({ h: nextHue, s: saturation, l: lightness });
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

  return (
    <>
      <div
        ref={panelRef}
        className={styles.picker}
        role="dialog"
        aria-label="Seletor de cores"
        style={{
          left: position?.left ?? 0,
          top: position?.top ?? 0,
          visibility: isSampling || !position ? "hidden" : "visible",
        }}
      >
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

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.swatchButton}
            data-testid="color-picker-swatch"
            style={{ backgroundColor: state.activeColor }}
            aria-label="Capturar cor do canvas"
            title={`Capturar cor do canvas (${state.activeColor})`}
            onClick={startSampling}
          >
            <span
              className={styles.swatchIcon}
              style={
                {
                  "--icon-url": `url("${EyedropperIcon}")`,
                } as React.CSSProperties
              }
            />
          </button>
          <SliderControl
            id="wheel-hue"
            label="H"
            min={0}
            max={360}
            step={1}
            value={Math.round(state.hue)}
            onChange={(value) =>
              commitHsl({ h: value, s: saturation, l: lightness })
            }
            compact
            suffix="°"
          />
          <SliderControl
            id="wheel-saturation"
            label="S"
            min={0}
            max={100}
            step={1}
            value={Math.round(saturation)}
            onChange={(value) =>
              commitHsl({ h: hue, s: value, l: lightness })
            }
            compact
            suffix="%"
          />
          <SliderControl
            id="wheel-lightness"
            label="L"
            min={0}
            max={100}
            step={1}
            value={Math.round(lightness)}
            onChange={(value) =>
              commitHsl({ h: hue, s: saturation, l: value })
            }
            compact
            suffix="%"
          />
        </div>
      </div>
      {isSampling && (
        <div
          className={styles.samplingOverlay}
          data-testid="color-sampling-overlay"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onMouseMove={handleSamplingMove}
          onClick={handleSamplingClick}
          onContextMenu={(event) => event.preventDefault()}
        >
          {preview?.color && (
            <span
              className={styles.samplingPreview}
              style={{ left: preview.x + 14, top: preview.y + 14 }}
            >
              <span
                className={styles.samplingSwatch}
                data-testid="color-sampling-preview"
                style={{ backgroundColor: preview.color }}
              />
              {preview.color}
            </span>
          )}
          <span className={styles.samplingHint}>
            Clique para capturar a cor · Esc cancela
          </span>
        </div>
      )}
    </>
  );
};

const WheelColorPicker = () => {
  const { on } = useEventBus();
  const [request, setRequest] = useState<
    (ColorPickerRequest & { id: number }) | null
  >(null);
  const nextId = useRef(0);

  useEffect(
    () =>
      on("colorPicker:open", (payload) => {
        nextId.current += 1;
        setRequest({ ...payload, id: nextId.current });
      }),
    [on],
  );

  if (!request) return null;

  return createPortal(
    <ColorPickerPanel
      key={request.id}
      anchor={request.anchor}
      color={request.color}
      onChange={request.onChange}
      onClose={() => setRequest(null)}
    />,
    document.body,
  );
};

export default WheelColorPicker;
