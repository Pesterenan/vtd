import type { Layer } from "src/components/types";
import styles from "../LayersMenu.module.css";

import ClosedEyeIcon from "src/assets/icons/closed-eye.svg";
import OpenEyeIcon from "src/assets/icons/open-eye.svg";
import LockedIcon from "src/assets/icons/lock.svg";
import UnlockedIcon from "src/assets/icons/unlock.svg";
import FilterIcon from "src/assets/icons/filter.svg";
import GroupArrowIcon from "src/assets/icons/group-arrow.svg";
import IconToggle from "src/components/IconToggle/IconToggle";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";

function isLayerOrDescendantSelected(layer: Layer, selectedIds: Set<number>): boolean {
  if (selectedIds.has(layer.id)) return true;
  if (layer.children) {
    return layer.children.every(child => isLayerOrDescendantSelected(child, selectedIds));
  }
  return false;
}

export const LayerBase = ({
  layer,
  extraToggle,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  isDragOverBefore,
  isDragOverAfter,
  isSelected,
  children,
}: {
  layer: Layer;
  extraToggle?: ReactNode;
  onDragStart: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent<HTMLLIElement>) => void;
  onClick: (e: React.MouseEvent) => void;
  isDragOverBefore?: boolean;
  isDragOverAfter?: boolean;
  isSelected?: boolean;
  children?: ReactNode;
}) => {
  const { emit } = useEventBus();
  const [isEditing, setIsEditing] = useState(false);
  const nameInputRef = useRef(null);

  const layerName = layer.name.length ? layer.name : `Camada ${layer.id}`;

  function handleLayerNameDoubleClick(
    event: React.MouseEvent<HTMLSpanElement>,
  ): void {
    event.stopPropagation();
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
        nameInputRef.current.select();
      }
    }, 0);
    setIsEditing(true);
  }

  function handleLayerNameKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void {
    if (event.key === "Escape") {
      setIsEditing(false);
      return;
    }
    if (event.key === "Enter") {
      const newName = (event.target as HTMLInputElement).value;
      if (newName.length) {
        emit("workarea:updateElement", {
          elementId: layer.id,
          layerName: newName,
        });
        setIsEditing(false);
      }
    }
  }

  function handleLayerNameBlur(
    event: React.FocusEvent<HTMLInputElement>,
  ): void {
    event.stopPropagation();
    setIsEditing(false);
  }

  function handleLockChange(checked: boolean): void {
    emit("workarea:updateElement", {
      elementId: layer.id,
      isLocked: checked,
    });
  }

  function handleVisibleChange(checked: boolean): void {
    emit("workarea:updateElement", {
      elementId: layer.id,
      isVisible: checked,
    });
  }

  return (
    <li
      key={`layer-${layer.id}`}
      id={`layer-${layer.id}`}
      className={`${styles.layerItem}${isDragOverBefore ? ` ${styles.dragOverBefore}` : ""}${isDragOverAfter ? ` ${styles.dragOverAfter}` : ""} ${isSelected ? ` ${styles.selected}` : ""}`}
      data-id={layer.id}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
    >
      <div className={styles.titleRow}>
        <div className={styles.controls}>
          <IconToggle
            id={`tgl_visibility-${layer.id}`}
            checked={layer.isVisible}
            onChange={handleVisibleChange}
            checkedIcon={OpenEyeIcon}
            uncheckedIcon={ClosedEyeIcon}
          />
          <IconToggle
            id={`tgl_lock-${layer.id}`}
            checked={layer.isLocked}
            onChange={handleLockChange}
            checkedIcon={LockedIcon}
            uncheckedIcon={UnlockedIcon}
          />
          {extraToggle}
          <div className={styles.layerInfo}>
            {isEditing ? (
              <input
                autoComplete="false"
                id={`inp_layer-${layer.id}`}
                type="text"
                className={styles.nameInput}
                defaultValue={layerName}
                onKeyDown={handleLayerNameKeyDown}
                onBlur={handleLayerNameBlur}
                onClick={(e) => e.stopPropagation()}
                ref={nameInputRef}
              />
            ) : (
              <span
                id={`spn_layer-${layer.id}`}
                className={styles.layerName}
                onDoubleClick={handleLayerNameDoubleClick}
              >
                {layerName}
              </span>
            )}
          </div>
        </div>
      </div>
      {children}
    </li>
  );
};

export const renderLayer = (
  layer: Layer,
  getDragStart: (id: number) => (e: React.DragEvent<HTMLLIElement>) => void,
  handleOnDrop: (e: React.DragEvent<HTMLLIElement>) => void,
  handleOnDragOver: (e: React.DragEvent) => void,
  getLayerClick?: (
    layer: Layer,
    isGroup: boolean,
  ) => (e: React.MouseEvent) => void,
  isCollapsed?: boolean,
  onToggleCollapse?: (collapsed: boolean) => void,
  getItemDragOver?: (targetId: number) => (e: React.DragEvent) => void,
  getItemDragLeave?: (targetId: number) => (e: React.DragEvent) => void,
  hoverTarget?: { targetId: number; position: "before" | "after" } | null,
  selectedIds?: Set<number>,
) => {
  const isGroup = "children" in layer && layer.children !== undefined;
  const onDragStart = getDragStart(layer.id);
  const onClick = getLayerClick?.(layer, isGroup);
  const isHover = hoverTarget?.targetId === layer.id;
  const isDragOverBefore = isHover && hoverTarget.position === "before";
  const isDragOverAfter = isHover && hoverTarget.position === "after";
  const onItemDragOver = getItemDragOver?.(layer.id) ?? handleOnDragOver;
  const onItemDragLeave = getItemDragLeave?.(layer.id);
  const isSelected = selectedIds ? isLayerOrDescendantSelected(layer, selectedIds) : false;
  return isGroup ? (
    <LayerGroup
      layer={layer}
      getDragStart={getDragStart}
      onDragStart={onDragStart}
      onDragOver={onItemDragOver}
      onDragLeave={onItemDragLeave}
      onDrop={handleOnDrop}
      onClick={onClick}
      getLayerClick={getLayerClick}
      isCollapsed={isCollapsed ?? true}
      onToggleCollapse={onToggleCollapse}
      isDragOverBefore={isDragOverBefore}
      isDragOverAfter={isDragOverAfter}
      handleOnDragOver={handleOnDragOver}
      getItemDragOver={getItemDragOver}
      getItemDragLeave={getItemDragLeave}
      isSelected={isSelected}
      selectedIds={selectedIds}
    />
  ) : (
    <LayerItem
      layer={layer}
      onDragStart={onDragStart}
      onDragOver={onItemDragOver}
      onDragLeave={onItemDragLeave}
      onDrop={handleOnDrop}
      onClick={onClick}
      isDragOverBefore={isDragOverBefore}
      isDragOverAfter={isDragOverAfter}
      isSelected={isSelected}
    />
  );
};

export const LayerItem = ({
  layer,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  isDragOverBefore,
  isDragOverAfter,
  isSelected,
}: {
  layer: Layer;
  onDragStart: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent<HTMLLIElement>) => void;
  onClick?: (e: React.MouseEvent) => void;
  isDragOverBefore?: boolean;
  isDragOverAfter?: boolean;
  isSelected?: boolean,
}) => {
  const { emit } = useEventBus();

  const FilterButton = () => {
    function handleFiltersClick(_checked: boolean): void {
      emit("dialog:elementFilters:open", { layerId: layer.id });
    }

    return (
      <IconToggle
        id={`btn_filters-${layer.id}`}
        onChange={handleFiltersClick}
        uncheckedIcon={FilterIcon}
      />
    );
  };

  return (
    <LayerBase
      layer={layer}
      extraToggle={<FilterButton />}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      isDragOverBefore={isDragOverBefore}
      isDragOverAfter={isDragOverAfter}
      isSelected={isSelected}
    />
  );
};

export const LayerGroup = ({
  layer,
  getDragStart,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  getLayerClick,
  isCollapsed,
  onToggleCollapse,
  isDragOverBefore,
  isDragOverAfter,
  handleOnDragOver,
  getItemDragOver,
  getItemDragLeave,
  isSelected,
  selectedIds,
}: {
  layer: Layer;
  getDragStart: (id: number) => (e: React.DragEvent<HTMLLIElement>) => void;
  onDragStart: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent<HTMLLIElement>) => void;
  onClick?: (e: React.MouseEvent) => void;
  getLayerClick?: (
    layer: Layer,
    isGroup: boolean,
  ) => (e: React.MouseEvent) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  isDragOverBefore?: boolean;
  isDragOverAfter?: boolean;
  isSelected?: boolean;
  handleOnDragOver?: (e: React.DragEvent) => void;
  getItemDragOver?: (targetId: number) => (e: React.DragEvent) => void;
  getItemDragLeave?: (targetId: number) => (e: React.DragEvent) => void;
  selectedIds?: Set<number>;
}) => {
  const collapsed = isCollapsed ?? true;
  const CollapseToggle = () => {
    return (
      <IconToggle
        id={`btn_filters-${layer.id}`}
        checked={collapsed}
        checkedIcon={GroupArrowIcon}
        onChange={onToggleCollapse}
        uncheckedIcon={GroupArrowIcon}
      />
    );
  };
  return (
    <LayerBase
      layer={layer}
      extraToggle={<CollapseToggle />}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      isDragOverBefore={isDragOverBefore}
      isDragOverAfter={isDragOverAfter}
      isSelected={isSelected}
    >
      {layer.children && layer.children.length > 0 && !collapsed && (
        <ul
          id={`ul_group-children-${layer.id}`}
          className={styles.groupChildren}
          onDragOver={handleOnDragOver ?? onDragOver}
        >
          {layer.children.map((child) =>
            renderLayer(
              child,
              getDragStart,
              onDrop,
              handleOnDragOver ?? onDragOver,
              getLayerClick,
              isCollapsed,
              onToggleCollapse,
              getItemDragOver,
              getItemDragLeave,
              undefined,
              selectedIds,
            ),
          )}
        </ul>
      )}
    </LayerBase>
  );
};
