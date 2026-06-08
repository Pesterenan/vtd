import { useEffect, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import AboutDialog from "./AboutDialog";

const DialogController = () => {
  const { on, emit } = useEventBus();
  const [dialogs, setDialogs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubs = [
      on("dialog:about:open", () => setDialogs(d => ({ ...d, about: true }))),
    ];
    return () => unsubs.forEach(u => u());
  }, [on]);

  const close = (name: string) => {
    setDialogs(d => ({ ...d, [name]: false }));
  }

  return (
    <>
      <AboutDialog isOpen={dialogs.about} onClose={() => close("about")} />
    </>
  );
};

export default DialogController;
