import { useEffect, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import AboutDialog from "./AboutDialog";
import NewProjectDialog from "./NewProjectDialog";
import ExportImageDialog from "./ExportImageDialog";
import ProjectPropertiesDialog from "./ProjectPropertiesDialog";
import ApplyCropDialog from "./ApplyCropDialog";
import ElementFiltersDialog from "./ElementFiltersDialog";

const DialogController = () => {
  const { on } = useEventBus();
  const [dialogs, setDialogs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubs = [
      on("dialog:about:open", () => setDialogs(d => ({ ...d, about: true }))),
      on("dialog:newProject:open", () => setDialogs(d => ({ ...d, newProject: true }))),
      on("dialog:exportImage:open", () => setDialogs(d => ({ ...d, exportImage: true }))),
      on("dialog:projectProperties:open", () => setDialogs(d => ({ ...d, projectProperties: true }))),
      on("dialog:applyCrop:open", () => setDialogs(d => ({ ...d, applyCrop: true }))),
      on("dialog:elementFilters:open", () => setDialogs(d => ({ ...d, elementFilters: true }))),
    ];
    return () => unsubs.forEach(u => u());
  }, [on]);

  const close = (name: string) => {
    setDialogs(d => ({ ...d, [name]: false }));
  }

  return (
    <>
      <AboutDialog isOpen={dialogs.about} onClose={() => close("about")} />
      <NewProjectDialog isOpen={dialogs.newProject} onClose={() => close("newProject")} />
      <ExportImageDialog isOpen={dialogs.exportImage} onClose={() => close("exportImage")} />
      <ProjectPropertiesDialog isOpen={dialogs.projectProperties} onClose={() => close("projectProperties")} />
      <ApplyCropDialog isOpen={dialogs.applyCrop} onClose={() => close("applyCrop")} />
      <ElementFiltersDialog isOpen={dialogs.elementFilters} onClose={() => close("elementFilters")} />
    </>
  );
};

export default DialogController;
