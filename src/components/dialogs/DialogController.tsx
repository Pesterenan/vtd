import { useEffect, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import AboutDialog from "./AboutDialog";
import NewProjectDialog from "./NewProjectDialog";
import ExportImageDialog from "./ExportImageDialog";

const DialogController = () => {
  const { on } = useEventBus();
  const [dialogs, setDialogs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubs = [
      on("dialog:about:open", () => setDialogs(d => ({ ...d, about: true }))),
      on("dialog:newProject:open", () => setDialogs(d => ({ ...d, newProject: true }))),
      on("dialog:exportImage:open", () => setDialogs(d => ({ ...d, exportImage: true }))),
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
    </>
  );
};

export default DialogController;
