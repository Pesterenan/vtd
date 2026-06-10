import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import { EventBusProvider } from "src/contexts/EventBusContext";
import AlertsProvider from "src/components/Alerts/AlertsProvider";
import { EventBus } from "src/utils/eventBus";
import type { ISelectInput } from "src/components/helpers/createSelectInput";
import createSelectInput from "src/components/helpers/createSelectInput";
import type { ISliderControl } from "src/components/helpers/createSliderControl";
import createSliderControl from "src/components/helpers/createSliderControl";
import { clamp } from "src/utils/easing";
import formatFrameIntoTime from "src/utils/formatFrameIntoTime";
import { VFEManager } from "./VFEManager";
import type { IVideoMetadata } from "src/types";
import "./VFEModule.css";
import { listen } from "@tauri-apps/api/event";

const seekButtons = [
  { seek: "start", title: "(CTRL+SHIFT+E) retrocede para o começo", label: "|\u25C0" },
  { seek: "-5s", title: "(CTRL+E) retrocede 5 segundos", label: "\u25C05" },
  { seek: "-1s", title: "(SHIFT+E) retrocede 1 segundo", label: "\u25C01" },
  { seek: "-1", title: "(E) retrocede 1 quadro", label: "\u25C0" },
  { seek: "+1", title: "(R) avança 1 quadro", label: "\u25B6" },
  { seek: "+1s", title: "(SHIFT+R) avança 1 segundo", label: "1\u25B6" },
  { seek: "+5s", title: "(CTRL+R) avança 5 segundos", label: "5\u25B6" },
  { seek: "end", title: "(CTRL+SHIFT+R) avança para o final", label: "\u25B6|" },
];

const VFEContent = ({ eventBus: parentEventBus }: { eventBus: EventBus }) => {
  const { on } = useEventBus();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<VFEManager | null>(null);

  const transformRef = useRef<HTMLDivElement>(null);
  const aspectRef = useRef<HTMLDivElement>(null);
  const seekSliderRef = useRef<HTMLInputElement>(null);
  const seekIndicatorRef = useRef<HTMLDivElement>(null);

  const xSliderRef = useRef<ISliderControl | null>(null);
  const ySliderRef = useRef<ISliderControl | null>(null);
  const wSliderRef = useRef<ISliderControl | null>(null);
  const hSliderRef = useRef<ISliderControl | null>(null);
  const aspectSelectRef = useRef<ISelectInput | null>(null);

  const frameRateRef = useRef(30);
  const totalFramesRef = useRef(100);

  const [videoInfo, setVideoInfo] = useState("");
  const [durationText, setDurationText] = useState("00:00:00 [00]");

  const updateIndicator = useCallback(() => {
    const slider = seekSliderRef.current;
    const indicator = seekIndicatorRef.current;
    if (!slider || !indicator) return;
    const frame = Math.round(Number(slider.value));
    indicator.textContent = formatFrameIntoTime(frame, frameRateRef.current);
    setDurationText(formatFrameIntoTime(frame, frameRateRef.current));
  }, []);

  const seekTo = useCallback((seekValue: string) => {
    const slider = seekSliderRef.current;
    const manager = managerRef.current;
    const totalFrames = totalFramesRef.current;
    if (!slider || !manager) return;

    const minValue = 0;
    const maxValue = totalFrames - 1;
    let currentValue = Number(slider.value);

    if (seekValue === "start") {
      currentValue = minValue;
    } else if (seekValue === "end") {
      currentValue = maxValue;
    } else {
      const isTime = seekValue.endsWith("s");
      let delta: number;
      if (isTime) {
        delta = Number(seekValue.slice(0, -1)) * frameRateRef.current;
      } else {
        delta = Number(seekValue);
      }
      currentValue += delta;
    }

    currentValue = clamp(currentValue, minValue, maxValue);
    slider.value = currentValue.toString();

    const ratio = totalFrames > 1 ? currentValue / (totalFrames - 1) : 0;
    manager.scrubTo(ratio);
    updateIndicator();
    manager.seekFrame(Math.round(currentValue));
  }, [updateIndicator]);

  const handleSliderInput = useCallback(() => {
    const manager = managerRef.current;
    const slider = seekSliderRef.current;
    const totalFrames = totalFramesRef.current;
    if (!manager || !slider) return;

    const value = Number(slider.value);
    const ratio = totalFrames > 1 ? value / (totalFrames - 1) : 0;
    manager.scrubTo(ratio);
    updateIndicator();
  }, [updateIndicator]);

  const handleSliderChange = useCallback(() => {
    const manager = managerRef.current;
    const slider = seekSliderRef.current;
    if (!manager || !slider) return;
    manager.seekFrame(Math.round(Number(slider.value)));
  }, []);

  const handleKeyDown = useCallback((evt: KeyboardEvent) => {
    const slider = seekSliderRef.current;
    const manager = managerRef.current;
    const totalFrames = totalFramesRef.current;
    if (!slider || !manager) return;

    const { code, repeat, shiftKey, ctrlKey } = evt;
    const minValue = 0;
    const maxValue = totalFrames - 1;
    let currentValue = Number(slider.value);

    let handled = false;

    if (code === "KeyE") {
      if (ctrlKey && shiftKey) {
        currentValue = minValue;
      } else if (ctrlKey) {
        currentValue -= 5 * frameRateRef.current;
      } else if (shiftKey) {
        currentValue -= frameRateRef.current;
      } else {
        currentValue -= 1;
      }
      handled = true;
    } else if (code === "KeyR") {
      if (ctrlKey && shiftKey) {
        currentValue = maxValue;
      } else if (ctrlKey) {
        currentValue += 5 * frameRateRef.current;
      } else if (shiftKey) {
        currentValue += frameRateRef.current;
      } else {
        currentValue += 1;
      }
      handled = true;
    }

    if (!handled) return;

    evt.preventDefault();
    currentValue = clamp(currentValue, minValue, maxValue);
    slider.value = currentValue.toString();

    const ratio = totalFrames > 1 ? currentValue / (totalFrames - 1) : 0;
    manager.scrubTo(ratio);
    updateIndicator();

    if (!repeat) {
      manager.seekFrame(Math.round(currentValue));
    }
  }, [updateIndicator]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSwap = useCallback(() => {
    managerRef.current?.swapSize();
    if (aspectSelectRef.current?.getValue() && aspectSelectRef.current.getValue() !== "custom") {
      aspectSelectRef.current.setValue("custom");
    }
  }, []);

  const handleReset = useCallback(() => {
    managerRef.current?.reset(aspectSelectRef.current?.getValue() ?? null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const manager = new VFEManager(canvas, parentEventBus);
    managerRef.current = manager;

    const metadata = (window as unknown as Record<string, unknown>).__videoMetadata as IVideoMetadata | undefined;
    if (metadata) {
      totalFramesRef.current = metadata.totalFrames ?? 100;
      frameRateRef.current = metadata.frameRate;
      const { width, height } = metadata;
      const format = metadata.format || "";
      const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
      const g = gcd(width, height);
      setVideoInfo(
        `${width} x ${height} px | ${width / g}:${height / g} | ${metadata.frameRate} fps${format ? ` | ${format.toUpperCase()}` : ""}`
      );

      const slider = seekSliderRef.current;
      if (slider && metadata.totalFrames) {
        slider.max = (metadata.totalFrames - 1).toString();
        slider.step = "1";
      }

      manager.loadVideo(metadata).then(() => {
        const scale = manager.getScale();
        xSliderRef.current?.setOptions({ max: width });
        ySliderRef.current?.setOptions({ max: height });
        wSliderRef.current?.setOptions({ max: width });
        hSliderRef.current?.setOptions({ max: height });
      });
    }

    const unlistenPromise = listen<IVideoMetadata>("vfe:video-metadata", (event) => {
      const md = event.payload;
      totalFramesRef.current = md.totalFrames ?? 100;
      frameRateRef.current = md.frameRate;
      const { width: w, height: h } = md;
      const fmt = md.format || "";
      const gcd2 = (a: number, b: number): number => (b ? gcd2(b, a % b) : a);
      const g2 = gcd2(w, h);
      setVideoInfo(
        `${w} x ${h} px | ${w / g2}:${h / g2} | ${md.frameRate} fps${fmt ? ` | ${fmt.toUpperCase()}` : ""}`
      );
      const sld = seekSliderRef.current;
      if (sld && md.totalFrames) {
        sld.max = (md.totalFrames - 1).toString();
        sld.step = "1";
        sld.value = "0";
      }
      const indicator = seekIndicatorRef.current;
      if (indicator) indicator.textContent = "00:00:00 [00]";
      setDurationText("00:00:00 [00]");
      manager.loadVideo(md).then(() => {
        const scale = manager.getScale();
        xSliderRef.current?.setOptions({ max: w });
        ySliderRef.current?.setOptions({ max: h });
        wSliderRef.current?.setOptions({ max: w });
        hSliderRef.current?.setOptions({ max: h });
      });
    });

    return () => {
      manager.destroy();
      managerRef.current = null;
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [parentEventBus]);

  useEffect(() => {
    if (!managerRef.current) return;
    const scale = managerRef.current.getScale();

    const create = () => {
      const transform = transformRef.current;
      const aspect = aspectRef.current;
      if (!transform || !aspect) return;

      const xSlider = createSliderControl(
        "vfe_x-pos", "X",
        { min: 0, max: 10000, step: 1, value: 0 },
        (value) => {
          const p = managerRef.current?.getExtractBoxPosition();
          if (p) managerRef.current?.setPosition(Math.round(value / scale.x), p.y);
        },
        false,
      );
      xSlider.enable();
      transform.appendChild(xSlider.element);
      xSliderRef.current = xSlider;

      const ySlider = createSliderControl(
        "vfe_y-pos", "Y",
        { min: 0, max: 10000, step: 1, value: 0 },
        (value) => {
          const p = managerRef.current?.getExtractBoxPosition();
          if (p) managerRef.current?.setPosition(p.x, Math.round(value / scale.y));
        },
        false,
      );
      ySlider.enable();
      transform.appendChild(ySlider.element);
      ySliderRef.current = ySlider;

      const wSlider = createSliderControl(
        "vfe_width", "W",
        { min: 10, max: 10000, step: 1, value: 100 },
        (value) => {
          const s = managerRef.current?.getExtractBoxSize();
          if (s) managerRef.current?.setSize(Math.round(value / scale.x), s.height);
        },
        false,
      );
      wSlider.enable();
      transform.appendChild(wSlider.element);
      wSliderRef.current = wSlider;

      const hSlider = createSliderControl(
        "vfe_height", "H",
        { min: 10, max: 10000, step: 1, value: 100 },
        (value) => {
          const s = managerRef.current?.getExtractBoxSize();
          if (s) managerRef.current?.setSize(s.width, Math.round(value / scale.y));
        },
        false,
      );
      hSlider.enable();
      transform.appendChild(hSlider.element);
      hSliderRef.current = hSlider;

      const aspectSelect = createSelectInput(
        "vfe_aspect-ratio", "Proporção",
        {
          optionValues: [
            { label: "Personalizado", value: "custom" },
            { label: "1:1 (Quadrado)", value: "1:1" },
            { label: "4:3 (Tradicional)", value: "4:3" },
            { label: "5:7 (Retrato)", value: "5:7" },
            { label: "16:9 (Widescreen)", value: "16:9" },
            { label: "21:9 (Cinemascópio)", value: "21:9" },
          ],
          value: "16:9",
        },
        (value) => {
          managerRef.current?.setAspectRatio(value);
        },
      );
      aspectSelect.enable();
      aspect.appendChild(aspectSelect.element);
      aspectSelectRef.current = aspectSelect;
    };

    create();

    return () => {
      xSliderRef.current?.disable();
      ySliderRef.current?.disable();
      wSliderRef.current?.disable();
      hSliderRef.current?.disable();
      aspectSelectRef.current?.disable();
    };
  }, []);

  useEffect(() => {
    const slider = seekSliderRef.current;
    if (!slider) return;
    slider.addEventListener("input", handleSliderInput);
    slider.addEventListener("change", handleSliderChange);
    return () => {
      slider.removeEventListener("input", handleSliderInput);
      slider.removeEventListener("change", handleSliderChange);
    };
  }, [handleSliderInput, handleSliderChange]);

  useEffect(() => {
    const unsub1 = on("vfe:extractbox:update", (payload) => {
      if (!managerRef.current) return;
      const s = managerRef.current.getScale();
      xSliderRef.current?.setValue(Math.round(payload.position.x * s.x));
      ySliderRef.current?.setValue(Math.round(payload.position.y * s.y));
      wSliderRef.current?.setValue(Math.round(payload.size.width * s.x));
      hSliderRef.current?.setValue(Math.round(payload.size.height * s.y));
    });
    return unsub1;
  }, [on]);

  return (
    <div id="vfe_main-container" className="container column ai-jc-c">
      <div id="vfe_properties-bar" className="sec_menu-style">
        <h5>Caixa de Extração:</h5>
        <div className="container jc-sb g-05">
          <div ref={transformRef} id="vfe_transform-controls" className="container ai-c g-05" />
          <div className="container g-05">
            <button id="vfe_btn-swap" className="btn-common" title="Inverter largura e altura" onClick={handleSwap}>&#x21C4;</button>
            <button id="vfe_btn-reset" className="btn-common" title="Redefinir caixa de extração" onClick={handleReset}>&#x27F2;</button>
            <div ref={aspectRef} id="vfe_aspect-ratio-container" className="container ai-c g-05" />
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} id="video-canvas" height="320" width="800" style={{ backgroundColor: "var(--background-300)" }} />
      <div id="vfe_video-info" className="container ai-c">{videoInfo}</div>
      <div id="sld_video-controls" className="sec_menu-style container ai-c jc-sb">
        <div id="vfe_seek-buttons" className="container pad-05" style={{ width: "fit-content" }}>
          {seekButtons.map((btn) => (
            <button key={btn.seek} className="btn-common" data-seek={btn.seek} title={btn.title} onClick={() => seekTo(btn.seek)}>
              {btn.label}
            </button>
          ))}
        </div>
        <div className="container pad-05" style={{ width: "100%" }}>
          <input
            ref={seekSliderRef}
            id="sld_video-duration"
            min="0"
            max="100"
            step="1"
            type="range"
            defaultValue="0"
          />
        </div>
        <div className="container pad-05" style={{ width: "fit-content" }}>
          <div ref={seekIndicatorRef} id="vfe_video-duration-indicator">{durationText}</div>
        </div>
      </div>
    </div>
  );
};

const VFEApp = () => {
  const eventBus = useMemo(() => new EventBus(), []);

  return (
    <EventBusProvider eventBus={eventBus}>
      <AlertsProvider>
        <VFEContent eventBus={eventBus} />
      </AlertsProvider>
    </EventBusProvider>
  );
};

export default VFEApp;
