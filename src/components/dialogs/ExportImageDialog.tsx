import { useEventBus } from "src/hooks/useEventBus";
import DialogBase from "./DialogBase";
import SelectInput from "../SelectInput/SelectInput";
import CheckboxInput from "../CheckboxInput/CheckboxInput";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import styles from "./ExportImageDialog.module.css";
import SliderControl from "../SliderControl/SliderControl";

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  );
}

const EXPORT_FORMAT_OPTIONS = [
  { value: "jpeg", label: ".JPG" },
  { value: "png", label: ".PNG" },
  { value: "webp", label: ".WEBP" },
];

const ExportImageDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { request, emit } = useEventBus();
  const [outputFormat, setOutputFormat] = useState("jpeg");
  const [transparency, setTransparency] = useState(true);
  const [quality, setQuality] = useState(100);
  const [estimatedSize, setEstimatedSize] = useState("--KB");

  const isJpeg = outputFormat === "jpeg";

  useEffect(() => {
    if (!isOpen) return;

    const updateEstimatedSize = async () => {
      const [canvasBlobPromise] = request("workarea:canvas:getBlob", {
        format: outputFormat,
        quality: String(quality),
        transparent: transparency,
      });
      if (canvasBlobPromise) {
        const canvasBlob = await canvasBlobPromise;
        if (canvasBlob) {
          setEstimatedSize(formatBytes(canvasBlob.blob.size));
        }
      }
    };

    updateEstimatedSize();
  }, [isOpen, outputFormat, quality, transparency, request]);

  const handleExport = async () => {
    const [canvasBlobPromise] = request("workarea:canvas:getBlob", {
      format: outputFormat,
      quality: String(quality),
      transparent: transparency,
    });
    if (canvasBlobPromise) {
      const canvasBlob = await canvasBlobPromise;
      if (canvasBlob) {
        const response = await invoke<{ success: boolean; message: string }>("export_canvas", {
          format: outputFormat,
          dataString: canvasBlob.dataURL,
        });
        emit("alert:add", {
          message: response.message,
          type: response.success ? "success" : "error",
        });
      }
    }
    onClose();
  };

  return (
    <DialogBase isOpen={isOpen} onClose={onClose} isDraggable={false} title={"Exportar Imagem"}>
      <div className="container column jc-c g-05">
        <div className="container g-05 jc-sb" id="div_export-format-container">
          <SelectInput id={"slc_export-format"} label={"Selecione o formato de exportação:"} options={EXPORT_FORMAT_OPTIONS} value={outputFormat} onChange={setOutputFormat} />
        </div>
        <div id="div_transparency-container" className="container g-05 jc-sb" style={{ visibility: isJpeg ? "hidden" : "visible" }}>
          <CheckboxInput id="chk_image-transparency" label="Fundo transparente" checked={transparency} onChange={setTransparency} />
        </div>
        <div id="div_image-quality-container" className="container g-05 jc-sb">
          <SliderControl
            includeSlider
            id="inp_image-quality-range"
            label="Qualidade da Imagem:"
            min={20} max={100} step={1}
            value={quality}
            onChange={setQuality}
          />
        </div>
        <br />
        <div className="container g-05 jc-sb">
          <p>Tamanho aproximado da imagem:</p>
          <strong id="str_image-size">{estimatedSize}</strong>
        </div>
      </div>
      <menu className={styles.actions}>
        <button id="btn_confirm-export-image" className="btn-common-wide" onClick={handleExport}>Exportar</button>
        <button id="btn_close-export-image-dialog" className="btn-common-wide" onClick={onClose}>Cancelar</button>
      </menu>
    </DialogBase>
  );
};

export default ExportImageDialog;
