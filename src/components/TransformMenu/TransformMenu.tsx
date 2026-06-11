import { useEffect, useRef, useState } from "react";
import SliderControl from "../SliderControl/SliderControl";
import { useEventBus } from "src/hooks/useEventBus";
import type { EventBusMap } from "src/utils/eventBus";
import type { CroppingBox } from "src/utils/croppingBox";
import styles from "./TransformMenu.module.css";

type TransformField = "x" | "y" | "width" | "height" | "rotation" | "opacity";

const TRANSFORM_EVENTS: Record<TransformField, keyof EventBusMap> = {
  x: "transformBox:updatePosition",
  y: "transformBox:updatePosition",
  width: "transformBox:updateScale",
  height: "transformBox:updateScale",
  rotation: "transformBox:updateRotation",
  opacity: "transformBox:updateOpacity",
};

const TransformMenu = () => {
  const { on, emit, request } = useEventBus();
  const [selected, setSelected] = useState(false);
  const [props, setProps] = useState({ x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 });
  const [cropProps, setCropProps] = useState({ top: 0, left: 0, right: 100, bottom: 100 });
  const [hasCropping, setHasCropping] = useState(false);
  const [unscaledSize, setUnscaledSize] = useState({ width: 100, height: 100 });
  const selectedRef = useRef(false);

  useEffect(() => {
    const unsub1 = on("selection:changed", ({ selectedElements }) => {
      const isSelected = selectedElements.length > 0;
      selectedRef.current = isSelected;
      setSelected(isSelected);
      if (isSelected) {
        const [croppingBox] = request("transformBox:cropping:get");
        if (croppingBox) {
          setCropProps({
            top: croppingBox.top,
            left: croppingBox.left,
            right: croppingBox.right,
            bottom: croppingBox.bottom,
          });
          const [properties] = request("transformBox:properties:get");
          if (properties?.unscaledSize) {
            setUnscaledSize(properties.unscaledSize);
          }
          setHasCropping(true);
        } else {
          setHasCropping(false);
        }
      } else {
        setHasCropping(false);
      }
    });
    const unsub2 = on("transformBox:properties:change", (payload) => {
      setProps({
        x: payload.position.x, y: payload.position.y,
        width: payload.size.width, height: payload.size.height,
        rotation: payload.rotation, opacity: payload.opacity,
      });
    });
    const unsub3 = on("transformBox:cropping:changed", (croppingBox: CroppingBox) => {
      if (croppingBox) {
        setCropProps({
          top: croppingBox.top,
          left: croppingBox.left,
          right: croppingBox.right,
          bottom: croppingBox.bottom,
        });
      }
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [on, emit, request]);

  const handleChange = (field: TransformField) => (value: number) => {
    if (field === "width" || field === "height") {
      value = Math.max(1, value);
    }
    const event = TRANSFORM_EVENTS[field];
    const payloadMap: Record<TransformField, EventBusMap[typeof event]["payload"]> = {
      x: { position: { x: value, y: props.y } },
      y: { position: { x: props.x, y: value } },
      width: { delta: { x: value / props.width, y: 1 } },
      height: { delta: { x: 1, y: value / props.height } },
      rotation: { delta: value },
      opacity: { delta: value },
    };
    emit(event, payloadMap[field]);
  };

  const handleCropChange = (property: "top" | "left" | "right" | "bottom") => (value: number) => {
    emit("transformMenu:cropping:update", { property, value });
  };

  if (!selected) {
    return (
      <section className={styles.section} aria-disabled={true}>
        <h5>Caixa de Transformação:</h5>
        <p className={styles.emptyState}>Nenhum elemento selecionado</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h5>Caixa de Transformação:</h5>
      <SliderControl id="x-pos" label="X" min={-9999} max={9999} step={1} value={props.x} onChange={handleChange("x")} />
      <SliderControl id="y-pos" label="Y" min={-9999} max={9999} step={1} value={props.y} onChange={handleChange("y")} />
      <SliderControl id="width" label="Largura" min={1} max={9999} step={1} value={props.width} onChange={handleChange("width")} />
      <SliderControl id="height" label="Altura" min={1} max={9999} step={1} value={props.height} onChange={handleChange("height")} />
      <SliderControl id="rotation" label="Rotação" min={-360} max={360} step={0.1} value={props.rotation} onChange={handleChange("rotation")} />
      <SliderControl id="opacity" label="Opacidade" min={0} max={1} step={0.01} value={props.opacity} onChange={handleChange("opacity")} />
      <details className={styles.cropAccordion} data-disabled={!hasCropping || undefined}>
        <summary>Recorte</summary>
        <SliderControl id="crop-top" label="Cima" min={0} max={unscaledSize.height} step={1} value={cropProps.top} onChange={handleCropChange("top")} disabled={!hasCropping} />
        <SliderControl id="crop-left" label="Esquerda" min={0} max={unscaledSize.width} step={1} value={cropProps.left} onChange={handleCropChange("left")} disabled={!hasCropping} />
        <SliderControl id="crop-right" label="Direita" min={0} max={unscaledSize.width} step={1} value={cropProps.right} onChange={handleCropChange("right")} disabled={!hasCropping} />
        <SliderControl id="crop-bottom" label="Baixo" min={0} max={unscaledSize.height} step={1} value={cropProps.bottom} onChange={handleCropChange("bottom")} disabled={!hasCropping} />
      </details>
    </section>
  );
}

export default TransformMenu;
