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

/**
 * Where the dragged layer will land relative to the hovered target:
 * - "before"/"after": as a sibling, on the visual top/bottom edge of the target.
 * - "inside": nested into the hovered group.
 */
export type DropPosition = "before" | "after" | "inside";

export type HoverTarget = { targetId: number; position: DropPosition };

export interface LayerRenderOptions {
  getDragStart: (id: number) => (e: React.DragEvent<HTMLLIElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLLIElement>) => void;
  getLayerClick?: (
    layer: Layer,
    isGroup: boolean,
  ) => (e: React.MouseEvent) => void;
  collapsedIds?: Set<number>;
  getToggleCollapse?: (id: number) => (collapsed: boolean) => void;
  getItemDragOver?: (targetId: number) => (e: React.DragEvent) => void;
  getItemDragLeave?: (targetId: number) => (e: React.DragEvent) => void;
  getContextMenu?: (layer: Layer) => (e: React.MouseEvent) => void;
  hoverTarget?: HoverTarget | null;
  selectedIds?: Set<number>;
  draggingId?: number | null;
}

function isLayerOrDescendantSelected(
  layer: Layer,
  selectedIds: Set<number>,
): boolean {
  if (selectedIds.has(layer.id)) return true;
  // A group with no children must not count as selected: `[].every(...)` is
  // vacuously true, which made empty groups look permanently selected.
  if (layer.children && layer.children.length > 0) {
    return layer.children.every((child) =>
      isLayerOrDescendantSelected(child, selectedIds),
    );
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
  onDragEnd,
  onClick,
  onContextMenu,
  isDragOverBefore,
  isDragOverAfter,
  isDragOverInside,
  isDragging,
  isSelected,
  children,
}: {
  layer: Layer;
  extraToggle?: ReactNode;
  onDragStart: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLLIElement>) => void;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isDragOverBefore?: boolean;
  isDragOverAfter?: boolean;
  isDragOverInside?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
  children?: ReactNode;
}) => {
  const { emit } = useEventBus();
  const [isEditing, setIsEditing] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const layerName = layer.name?.length ? layer.name : `Camada ${layer.id}`;

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

  const itemClassName = [
    styles.layerItem,
    isDragOverBefore ? styles.dragOverBefore : "",
    isDragOverAfter ? styles.dragOverAfter : "",
    isDragOverInside ? styles.dragOverInside : "",
    isDragging ? styles.dragging : "",
    isSelected ? styles.selected : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li
      key={`layer-${layer.id}`}
      id={`layer-${layer.id}`}
      className={itemClassName}
      data-id={layer.id}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onContextMenu={onContextMenu}
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

export const renderLayer = (layer: Layer, options: LayerRenderOptions) => {
  const isGroup = "children" in layer && layer.children !== undefined;
  const onDragStart = options.getDragStart(layer.id);
  const onClick = options.getLayerClick?.(layer, isGroup);
  const onContextMenu = options.getContextMenu?.(layer);
  const isHover = options.hoverTarget?.targetId === layer.id;
  const position = isHover ? options.hoverTarget?.position : undefined;
  const isDragOverBefore = position === "before";
  const isDragOverAfter = position === "after";
  const isDragOverInside = position === "inside";
  const onItemDragOver = options.getItemDragOver?.(layer.id) ?? options.onDragOver;
  const onItemDragLeave = options.getItemDragLeave?.(layer.id);
  const isSelected = options.selectedIds
    ? isLayerOrDescendantSelected(layer, options.selectedIds)
    : false;
  const isDragging = options.draggingId === layer.id;
  const dragProps = {
    onDragStart,
    onDragOver: onItemDragOver,
    onDragLeave: onItemDragLeave,
    onDrop: options.onDrop,
    onDragEnd: options.onDragEnd,
    onClick,
    onContextMenu,
    isDragOverBefore,
    isDragOverAfter,
    isDragOverInside,
    isDragging,
    isSelected,
  };
  return isGroup ? (
    <LayerGroup key={layer.id} layer={layer} options={options} {...dragProps} />
  ) : (
    <LayerItem key={layer.id} layer={layer} {...dragProps} />
  );
};

export const LayerItem = ({
  layer,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onClick,
  onContextMenu,
  isDragOverBefore,
  isDragOverAfter,
  isDragOverInside,
  isDragging,
  isSelected,
}: {
  layer: Layer;
  onDragStart: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLLIElement>) => void;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isDragOverBefore?: boolean;
  isDragOverAfter?: boolean;
  isDragOverInside?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
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
      onDragEnd={onDragEnd}
      onClick={onClick}
      onContextMenu={onContextMenu}
      isDragOverBefore={isDragOverBefore}
      isDragOverAfter={isDragOverAfter}
      isDragOverInside={isDragOverInside}
      isDragging={isDragging}
      isSelected={isSelected}
    />
  );
};

export const LayerGroup = ({
  layer,
  options,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onClick,
  onContextMenu,
  isDragOverBefore,
  isDragOverAfter,
  isDragOverInside,
  isDragging,
  isSelected,
}: {
  layer: Layer;
  options: LayerRenderOptions;
  onDragStart: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent<HTMLLIElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLLIElement>) => void;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isDragOverBefore?: boolean;
  isDragOverAfter?: boolean;
  isDragOverInside?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
}) => {
  const isCollapsed = options.collapsedIds?.has(layer.id) ?? true;
  const collapsed = isCollapsed ?? true;
  const onToggleCollapse = options.getToggleCollapse?.(layer.id);
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
      onDragEnd={onDragEnd}
      onClick={onClick}
      onContextMenu={onContextMenu}
      isDragOverBefore={isDragOverBefore}
      isDragOverAfter={isDragOverAfter}
      isDragOverInside={isDragOverInside}
      isDragging={isDragging}
      isSelected={isSelected}
    >
      {layer.children && layer.children.length > 0 && !collapsed && (
        <ul
          id={`ul_group-children-${layer.id}`}
          className={styles.groupChildren}
          onDragOver={options.onDragOver}
        >
          {layer.children.map((child) => renderLayer(child, options))}
        </ul>
      )}
    </LayerBase>
  );
};
