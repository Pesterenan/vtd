import { useEffect, useRef, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import DialogBase from "./DialogBase";
import CheckboxInput from "../CheckboxInput/CheckboxInput";
import FilterControls from "../Filters/FilterControls";
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
  const [activeFilterIds, setActiveFilterIds] = useState<Set<string>>(new Set());
  const [editingProps, setEditingProps] = useState<FilterProperties | null>(null);
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
      setActiveFilterIds(new Set(element.filters.map((f) => f.id)));
      propertyCacheRef.current.clear();

      const filterManager = FilterManager.getInstance();
      const filters = filterManager.getAvailableFilters();
      const isGradient = element instanceof GradientElement;
      setAvailableFilters(
        isGradient
          ? filters.filter((f) => f.id !== "drop-shadow" && f.id !== "outer-glow")
          : filters,
      );
      setActiveFilterId(element.filters.length > 0 ? element.filters[0].id : null);
    });
    return unsub;
  }, [on, emit, request]);

  useEffect(() => {
    if (!activeFilterId || !activeElement) {
      setEditingProps(null);
      return;
    }
    const props = activeElement.filters.find((f) => f.id === activeFilterId);
    setEditingProps(props ? { ...props } : null);
  }, [activeFilterId, activeElement]);

  const isFilterActive = (filterId: string): boolean => {
    return activeFilterIds.has(filterId);
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
      setActiveFilterIds((prev) => new Set([...prev, filter.id]));
      setActiveFilterId(filter.id);
    } else {
      const propsToCache = activeElement.filters.find((f) => f.id === filter.id);
      if (propsToCache) {
        propertyCacheRef.current.set(filter.id, propsToCache);
        activeElement.filters = activeElement.filters.filter((f) => f.id !== filter.id);
      }
      setActiveFilterIds((prev) => {
        const next = new Set(prev);
        next.delete(filter.id);
        return next;
      });
      if (activeFilterId === filter.id) {
        const nextActive = activeElement.filters.length > 0 ? activeElement.filters[0].id : null;
        setActiveFilterId(nextActive);
      }
    }

    emit("workarea:update");
  };

  const handleApply = (): void => {
    onClose();
  };

  const handleCancel = (): void => {
    if (activeElement) {
      activeElement.filters = initialFiltersRef.current;
      setActiveFilterIds(new Set(initialFiltersRef.current.map((f) => f.id)));
      emit("workarea:update");
    }
    onClose();
  };

  const handleReset = (): void => {
    if (activeElement) {
      activeElement.filters = [];
      setActiveFilterIds(new Set());
      setActiveFilterId(null);
      propertyCacheRef.current.clear();
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
        {editingProps && (
          <FilterControls
            filterId={activeFilterId!}
            properties={editingProps}
            onChange={(updates) => {
              setEditingProps((prev) => prev ? { ...prev, ...updates } : null);
              const existing = activeElement!.filters.find((f) => f.id === activeFilterId);
              if (existing) {
                Object.assign(existing, updates);
                emit("workarea:update");
              }
            }}
          />
        )}
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
