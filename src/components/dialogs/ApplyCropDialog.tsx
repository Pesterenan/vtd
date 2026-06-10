import { useEventBus } from "src/hooks/useEventBus";
import DialogBase from "./DialogBase";
import { useEffect, useRef, useState } from "react";
import CheckboxInput from "../CheckboxInput/CheckboxInput";
import styles from "./ApplyCropDialog.module.css";

const ApplyCropDialog = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { on, emit } = useEventBus();
  const currentLayer = useRef<number | null>(null);
  const [keepOriginal, setKeepOriginal] = useState(false);
  const [smoothingEnabled, setSmoothingEnabled] = useState(true);

  useEffect(() => {
    const unsubs = [
      on("dialog:applyCrop:open", ({ layerId }) => {
        currentLayer.current = layerId;
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [on]);

  useEffect(() => {
    if (!isOpen) {
      currentLayer.current = null;
      setKeepOriginal(false);
      setSmoothingEnabled(true);
    }
  }, [isOpen]);

  const handleApplyCrop = (): void => {
    if (currentLayer.current) {
      emit("layer:applyCrop", {
        layerId: currentLayer.current,
        keepOriginal,
        smoothingEnabled,
      });
      emit("alert:add", { message: "Elemento recortado com sucesso.", type: "success" });
      onClose();
    }
  }

  return (
    <DialogBase isOpen={isOpen} onClose={onClose} title={"Aplicar Recorte"}>
      <div className="container column g-1">
        <div>
          <p>Deseja realmente recortar a imagem?</p>
          <p>Esta ação não pode ser desfeita.</p>
        </div>
        <div className="container column">
          <CheckboxInput id={"keep-original"} label={"Manter o elemento original"} checked={keepOriginal} onChange={setKeepOriginal} />
          <CheckboxInput id={"smoothing"} label={"Suavizar imagem do elemento recortado"} checked={smoothingEnabled} onChange={setSmoothingEnabled} />
        </div>
      </div>
      <menu className={styles.actions}>
        <button id="btn_apply-crop" className="btn-common-wide" onClick={handleApplyCrop}>Aceitar</button>
        <button id="btn_cancel-crop" className="btn-common-wide" onClick={onClose}>Cancelar</button>
      </menu>
    </DialogBase>
  );
};

export default ApplyCropDialog;
