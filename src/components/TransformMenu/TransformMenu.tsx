import { useEffect, useState } from "react";
import SliderControl from "../SliderControl/SliderControl";
import { useEventBus } from "src/hooks/useEventBus";
import type { EventBusMap } from "src/utils/eventBus";
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
  const { on, emit } = useEventBus();
  const [selected, setSelected] = useState(false);
  const [props, setProps] = useState({ x: 0, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 });

  useEffect(() => {
    const unsub1 = on("selection:changed", ({ selectedElements }) => {
      setSelected(selectedElements.length > 0);
    });
    const unsub2 = on("transformBox:properties:change", (payload) => {
      setProps({
        x: payload.position.x, y: payload.position.y,
        width: payload.size.width, height: payload.size.height,
        rotation: payload.rotation, opacity: payload.opacity,
      });
    });
    return () => { unsub1(); unsub2(); };
  }, [on]);

  const handleChange = (field: TransformField) => (value: number) => {
    const event = TRANSFORM_EVENTS[field];
    const payloadMap: Record<TransformField, EventBusMap[typeof event]["payload"]> = {
      x: { position: { x: value, y: props.y } },
      y: { position: { x: props.x, y: value } },
      width: { delta: { x: value / props.width, y: 1 } },
      height: { delta: { x: 1, y: value / props.height } },
      rotation: { delta: value - props.rotation },
      opacity: { delta: value - props.opacity },
    };
    emit(event, payloadMap[field]);
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
    </section>
  );
}

export default TransformMenu;
