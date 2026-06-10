import { TEMPLATE_DATA, TEMPLATE_OPTIONS } from "src/constants";
import SliderControl from "../SliderControl/SliderControl";
import DialogBase from "./DialogBase";
import { useEffect, useState } from "react";
import TextInput from "../TextInput/TextInput";
import SelectInput from "../SelectInput/SelectInput";
import { useEventBus } from "src/hooks/useEventBus";
import styles from "./ProjectPropertiesDialog.module.css";
import { version as APP_VERSION } from '../../../package.json';

interface IProjectProperties {
  title: string;
  size: { height: number; width: number };
  appVersion: string;
  filePath?: string;
}

function getFileName(filePath?: string): string {
  if (!filePath) return "Ainda não salvo";
  return filePath.split(/[/\\]/).pop() ?? "Ainda não salvo";
}

const DEFAULT_PROJECT_DATA: IProjectProperties = {
  title: 'Sem título',
  size: { width: 1920, height: 1080 },
  appVersion: APP_VERSION,
  filePath: '',
}

const INITIAL_TEMPLATE = "Youtube Miniatura (Full HD)";

const ProjectPropertiesDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { on, emit } = useEventBus();
  const [projectData, setProjectData] = useState(DEFAULT_PROJECT_DATA);
  const [template, setTemplate] = useState(INITIAL_TEMPLATE);

  const handleWidthChange = (newWidth: number) => {
    setProjectData(prev => ({ ...prev, size: { ...prev.size, width: newWidth } }));
    setTemplate("CUSTOM");
  };

  const handleHeightChange = (newHeight: number) => {
    setProjectData(prev => ({ ...prev, size: { ...prev.size, height: newHeight } }));
    setTemplate("CUSTOM");
  };

  const handleTemplateChange = (newTemplate: string) => {
    const tpl = TEMPLATE_DATA[newTemplate];
    if (tpl) {
      setProjectData(prev => ({ ...prev, size: { height: tpl.height, width: tpl.width } }));
    }
    setTemplate(newTemplate);
  };

  const handleApplyProperties = () => {
    emit("workarea:updateProperties", {
      title: projectData.title,
      size: projectData.size,
    });
    onClose();
  }

  useEffect(() => {
    const unsubs = [
      on("dialog:projectProperties:open", (payload) => {
        setProjectData(payload);
        setTemplate("CUSTOM");
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [on]);

  return (
    <DialogBase isOpen={isOpen} title={"Propriedades"} isDraggable={false}>
      <TextInput id="project-name-input" label="Nome do Projeto" value={projectData.title} onChange={(title) => setProjectData(prev => ({ ...prev, title }))} />
      <SelectInput id="templates-input" label="Templates" options={TEMPLATE_OPTIONS} value={template} onChange={handleTemplateChange} />
      <SliderControl id="inp_workarea-width" label="Largura" min={16} max={4096} step={1} value={projectData.size.width} onChange={handleWidthChange} />
      <SliderControl id="inp_workarea-height" label="Altura" min={16} max={4096} step={1} value={projectData.size.height} onChange={handleHeightChange} />
      <div className="container column g-025 mt-05" style={{ fontSize: "0.8rem", opacity: 0.7 }}>
        <div><strong>Arquivo:</strong> <span id="prop-file-name">{getFileName(projectData.filePath)}</span></div>
        <div><strong>Versão da aplicação:</strong> {projectData.appVersion}</div>
      </div>
      <menu className={styles.actions}>
        <button id="btn_create-project" className="btn-common-wide" onClick={handleApplyProperties}>Aceitar</button>
        <button id="btn_cancel-project-creation" className="btn-common-wide" onClick={onClose}>Cancelar</button>
      </menu>
    </DialogBase>
  );
};

export default ProjectPropertiesDialog;
