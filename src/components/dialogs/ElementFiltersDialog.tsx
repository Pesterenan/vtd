import { useEffect, useRef, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import DialogBase from "./DialogBase";
import CheckboxInput from "../CheckboxInput/CheckboxInput";
import { FilterManager } from "src/filters/filterManager";
import type { Filter, FilterProperties } from "src/filters/filter";
import type { Element } from "src/components/elements/element";
import type { TElementData } from "src/components/types";
import { GradientElement } from "src/components/elements/gradientElement";
import styles from "./ElementFiltersDialog.module.css";

const ElementFiltersDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { on, emit, request } = useEventBus();
  const [activeElement, setActiveElement] = useState<Element<TElementData> | null>(null);
  const [availableFilters, setAvailableFilters] = useState<Filter[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const filterControlsRef = useRef<HTMLDivElement>(null);
  const initialFiltersRef = useRef<FilterProperties[]>([]);
  const propertyCacheRef = useRef<Map<string, FilterProperties>>(new Map());

  useEffect(() => {
    const unsub = on("dialog:elementFilters:open", ({ layerId }) => {
      emit("workarea:selectById", { elementsId: new Set([layerId]) });
      const [selectedElements] = request("workarea:selected:get");
      if (!selectedElements?.length) return;
      const element = selectedElements[0];
      setActiveElement(element);
      initialFiltersRef.current = JSON.parse(JSON.stringify(element.filters));
      propertyCacheRef.current.clear();

      const filterManager = FilterManager.getInstance();
      const filters = filterManager.getAvailableFilters();
      const isGradient = element instanceof GradientElement;
      setAvailableFilters(
        isGradient
          ? filters.filter((f) => f.id !== "drop-shadow" && f.id !== "outer-glow")
          : filters,
      );
      setActiveFilterId(null);
    });
    return unsub;
  }, [on, emit, request]);

  const isFilterActive = (filterId: string): boolean => {
    return activeElement?.filters?.some((f) => f.id === filterId) ?? false;
  };

  const handleToggleFilter = (filter: Filter, isChecked: boolean): void => {
    if (!activeElement) return;

    if (isChecked) {
      const cachedProps = propertyCacheRef.current.get(filter.id);
      if (cachedProps) {
        activeElement.filters.push(cachedProps);
        propertyCacheRef.current.delete(filter.id);
      } else {
        activeElement.filters.push(filter.createDefaultProperties());
      }
      setActiveFilterId(filter.id);
    } else {
      const propsToCache = activeElement.filters.find((f) => f.id === filter.id);
      if (propsToCache) {
        propertyCacheRef.current.set(filter.id, propsToCache);
        activeElement.filters = activeElement.filters.filter((f) => f.id !== filter.id);
      }
      setActiveFilterId(null);
    }

    emit("workarea:update");
  };

  useEffect(() => {
    const container = filterControlsRef.current;
    if (!container || !activeFilterId || !activeElement) return;

    container.innerHTML = "";

    const filterManager = FilterManager.getInstance();
    const filter = filterManager.getFilterById(activeFilterId);
    if (!filter) return;

    const properties = activeElement.filters.find((f) => f.id === activeFilterId);
    if (!properties) return;

    const controlsEl = filter.setupFilterControls(properties, (newProperties) => {
      const existing = activeElement.filters.find((f) => f.id === activeFilterId);
      if (existing) {
        Object.assign(existing, newProperties);
        emit("workarea:update");
      }
    });

    container.appendChild(controlsEl);

    return () => {
      container.innerHTML = "";
    };
  }, [activeFilterId, activeElement, emit]);

  const handleApply = (): void => {
    onClose();
  };

  const handleCancel = (): void => {
    if (activeElement) {
      activeElement.filters = initialFiltersRef.current;
      emit("workarea:update");
    }
    onClose();
  };

  const handleReset = (): void => {
    if (activeElement) {
      activeElement.filters = [];
      propertyCacheRef.current.clear();
      setActiveFilterId(null);
      emit("workarea:update");
    }
  };

  return (
    <DialogBase isOpen={isOpen} onClose={onClose} isDraggable title="Filtros de Elemento">
      <div className="container column" style={{ gap: "0.5rem" }}>
        <div id="filter-list" className="container column">
          {availableFilters.map((filter) => (
            <CheckboxInput
              key={filter.id}
              id={`filter-${filter.id}`}
              label={filter.label}
              checked={isFilterActive(filter.id)}
              onChange={(checked) => handleToggleFilter(filter, checked)}
            />
          ))}
        </div>
        <div id="filter-controls" ref={filterControlsRef} />
      </div>
      <menu className={styles.actions}>
        <button id="btn_accept-filters" className="btn-common-wide" onClick={handleApply}>Aplicar</button>
        <button id="btn_cancel-filters" className="btn-common-wide" onClick={handleCancel}>Cancelar</button>
        <button id="btn_reset-filters" className="btn-common-wide" onClick={handleReset}>Redefinir</button>
      </menu>
    </DialogBase>
  );
};

export default ElementFiltersDialog;
