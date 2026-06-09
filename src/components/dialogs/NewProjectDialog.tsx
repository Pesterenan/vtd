import { useState } from "react";
import SliderControl from "../SliderControl/SliderControl";
import TextInput from "../TextInput/TextInput";
import SelectInput from "../SelectInput/SelectInput";
import DialogBase from "./DialogBase";
import { version as APP_VERSION } from "../../../package.json";
import { TEMPLATE_DATA, TEMPLATE_OPTIONS } from "src/constants";
import styles from "./NewProjectDialog.module.css";
import { useEventBus } from "src/hooks/useEventBus";
import type { IProjectData } from "../types";

const INITIAL_TEMPLATE = "Youtube Miniatura (Full HD)";

const NewProjectDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { emit } = useEventBus();
  const [title, setTitle] = useState("Sem título");
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [template, setTemplate] = useState(INITIAL_TEMPLATE);

  const handleTemplateChange = (newTemplate: string) => {
    const tpl = TEMPLATE_DATA[newTemplate];
    if (tpl) {
      setWidth(tpl.width);
      setHeight(tpl.height);
    }
    setTemplate(newTemplate);
  };

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    setTemplate("CUSTOM");
  };

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
    setTemplate("CUSTOM");
  };

  const handleCreate = () => {
    const projectData: IProjectData = {
      title,
      workAreaSize: { width, height },
      createDate: new Date().toISOString(),
      modifyDate: new Date().toISOString(),
      elements: [],
      version: APP_VERSION,
    };
    emit("workarea:createNewProject", { projectData });
    emit("workarea:initialized");
    onClose();
  };

  return (
    <DialogBase isDraggable isOpen={isOpen} onClose={onClose} title="Novo Projeto">
      <div className="container column jc-c g-05">
        <TextInput id="project-name-input" label="Nome do Projeto" value={title} onChange={setTitle} />
        <SelectInput id="templates-input" label="Templates" options={TEMPLATE_OPTIONS} value={template} onChange={handleTemplateChange} />
        <SliderControl id="inp_workarea-width" label="Largura" min={16} max={4096} step={1} value={width} onChange={handleWidthChange} />
        <SliderControl id="inp_workarea-height" label="Altura" min={16} max={4096} step={1} value={height} onChange={handleHeightChange} />
      </div>
      <menu className={styles.actions}>
        <button id="btn_create-project" className="btn-common-wide" onClick={handleCreate}>Aceitar</button>
        <button id="btn_cancel-project-creation" className="btn-common-wide" onClick={onClose}>Cancelar</button>
      </menu>
    </DialogBase>
  );
};

export default NewProjectDialog;
