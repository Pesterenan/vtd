import { render, screen, fireEvent, act } from "@testing-library/react";
import { EventBusProvider } from "src/contexts/EventBusContext";
import { EventBus } from "src/utils/eventBus";
import DialogController from "./DialogController";
import AboutDialog from "./AboutDialog";
import NewProjectDialog from "./NewProjectDialog";
import ExportImageDialog from "./ExportImageDialog";
import ProjectPropertiesDialog from "./ProjectPropertiesDialog";
import ApplyCropDialog from "./ApplyCropDialog";
import ElementFiltersDialog from "./ElementFiltersDialog";
import type { FilterProperties } from "src/filters/filter";
import type { Element } from "src/components/elements/element";
import type { TElementData } from "src/components/types";

function renderDialog(Component: React.ComponentType<{ isOpen: boolean; onClose: () => void }>, isOpen = true) {
  const onClose = vi.fn();
  const eventBus = new EventBus();
  const view = render(
    <EventBusProvider eventBus={eventBus}>
      <Component isOpen={isOpen} onClose={onClose} />
    </EventBusProvider>
  );
  return { view, onClose, eventBus };
}

describe("AboutDialog", () => {
  it("renders when open", () => {
    renderDialog(AboutDialog);
    expect(screen.getByText(/versão/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    renderDialog(AboutDialog, false);
    expect(screen.queryByText(/versão/i)).not.toBeInTheDocument();
  });
});

describe("NewProjectDialog", () => {
  it("renders form when open", () => {
    renderDialog(NewProjectDialog);
    expect(screen.getByDisplayValue("Sem título")).toBeInTheDocument();
    expect(screen.getByText("Aceitar")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("emits workarea:createNewProject on accept", () => {
    const eventBus = new EventBus();
    const onClose = vi.fn();
    const emitSpy = vi.spyOn(eventBus, "emit");

    render(
      <EventBusProvider eventBus={eventBus}>
        <NewProjectDialog isOpen={true} onClose={onClose} />
      </EventBusProvider>
    );

    fireEvent.click(screen.getByText("Aceitar"));
    expect(emitSpy.mock.calls[0][0]).toBe("workarea:createNewProject");
    expect(emitSpy.mock.calls[1][0]).toBe("workarea:initialized");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on cancel", () => {
    const onClose = vi.fn();
    render(
      <EventBusProvider eventBus={new EventBus()}>
        <NewProjectDialog isOpen={true} onClose={onClose} />
      </EventBusProvider>
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("ExportImageDialog", () => {
  it("renders when open", () => {
    renderDialog(ExportImageDialog);
    expect(screen.getByText(/formato de exportação/i)).toBeInTheDocument();
  });

  it("shows transparency checkbox when PNG is selected", () => {
    const { view } = renderDialog(ExportImageDialog);
    const select = document.body.querySelector<HTMLSelectElement>("#slc_export-format-select-input")!;
    fireEvent.change(select, { target: { value: "png" } });
    expect(screen.getByText(/fundo transparente/i)).toBeInTheDocument();
  });

  it("closes on cancel", () => {
    const onClose = vi.fn();
    render(
      <EventBusProvider eventBus={new EventBus()}>
        <ExportImageDialog isOpen={true} onClose={onClose} />
      </EventBusProvider>
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("ProjectPropertiesDialog", () => {
  it("renders when open", () => {
    renderDialog(ProjectPropertiesDialog);
    expect(screen.getByText(/propriedades/i)).toBeInTheDocument();
  });

  it("updates from event payload", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <ProjectPropertiesDialog isOpen={true} onClose={vi.fn()} />
      </EventBusProvider>
    );

    act(() => {
      eventBus.emit("dialog:projectProperties:open", {
        title: "Meu Projeto",
        size: { width: 800, height: 600 },
        appVersion: "1.0.0",
        filePath: "/path/to/projeto.vtd",
      });
    });

    expect(screen.getByDisplayValue("Meu Projeto")).toBeInTheDocument();
  });
});

describe("ApplyCropDialog", () => {
  it("renders when open", () => {
    renderDialog(ApplyCropDialog);
    expect(screen.getByText(/recortar a imagem/i)).toBeInTheDocument();
  });

  it("emits layer:applyCrop on accept", () => {
    const eventBus = new EventBus();
    const onClose = vi.fn();
    const emitSpy = vi.spyOn(eventBus, "emit");

    render(
      <EventBusProvider eventBus={eventBus}>
        <ApplyCropDialog isOpen={true} onClose={onClose} />
      </EventBusProvider>
    );

    act(() => {
      eventBus.emit("dialog:applyCrop:open", { layerId: 42 });
    });

    fireEvent.click(screen.getByText("Aceitar"));
    expect(emitSpy).toHaveBeenCalledWith("layer:applyCrop", {
      layerId: 42,
      keepOriginal: false,
      smoothingEnabled: true,
    });
  });

  it("closes without emitting if no layer is set", () => {
    const eventBus = new EventBus();
    const onClose = vi.fn();
    const emitSpy = vi.spyOn(eventBus, "emit");

    render(
      <EventBusProvider eventBus={eventBus}>
        <ApplyCropDialog isOpen={true} onClose={onClose} />
      </EventBusProvider>
    );

    fireEvent.click(screen.getByText("Aceitar"));
    expect(emitSpy).not.toHaveBeenCalledWith("layer:applyCrop", expect.any(Object));
  });
});

describe("ElementFiltersDialog", () => {
  it("renders when open", () => {
    const eventBus = new EventBus();
    render(
      <EventBusProvider eventBus={eventBus}>
        <ElementFiltersDialog isOpen={true} onClose={vi.fn()} />
      </EventBusProvider>
    );
    expect(screen.getByText("Redefinir")).toBeInTheDocument();
  });

  it("renders filter list from event payload", () => {
    const eventBus = new EventBus();
    const mockElement = { filters: [] as FilterProperties[] } as Element<TElementData>;

    eventBus.on("workarea:selected:get", () => [mockElement]);

    render(
      <EventBusProvider eventBus={eventBus}>
        <ElementFiltersDialog isOpen={true} onClose={vi.fn()} />
      </EventBusProvider>
    );

    act(() => {
      eventBus.emit("dialog:elementFilters:open", { layerId: 1 });
    });

    expect(screen.getByText(/correção de cor/i)).toBeInTheDocument();
    expect(screen.getByText(/sombra/i)).toBeInTheDocument();
    expect(screen.getByText(/luz brilhante/i)).toBeInTheDocument();
  });
});
