import { useCallback, useEffect, useRef, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import { useLayerDrag } from "src/hooks/useLayerDrag";
import type { Layer } from "../types";
import type { AddElementPayload } from "src/utils/eventBus";
import { ImageElement } from "../elements/imageElement";
import styles from "./LayersMenu.module.css";

import ClosedEyeIcon from "src/assets/icons/closed-eye.svg";
import OpenEyeIcon from "src/assets/icons/open-eye.svg";
import LockedIcon from "src/assets/icons/lock.svg";
import UnlockedIcon from "src/assets/icons/unlock.svg";
import FilterIcon from "src/assets/icons/filter.svg";
import GroupIcon from "src/assets/icons/group.svg";
import TrashIcon from "src/assets/icons/trash.svg";

interface ContextMenuState {
  layer: Layer;
  x: number;
  y: number;
  canCrop: boolean;
}

function removeLayerById(
  layers: Layer[],
  id: number,
  removed?: (layer: Layer) => void,
): Layer[] {
  const result: Layer[] = [];
  for (const layer of layers) {
    if (layer.id === id) {
      removed?.(layer);
    } else {
      result.push({
        ...layer,
        children: layer.children
          ? removeLayerById(layer.children, id, removed)
          : undefined,
      });
    }
  }
  return result;
}

function getAllChildIds(layer: Layer): number[] {
  if (!layer.children || layer.children.length === 0) {
    return [layer.id];
  }
  const ids: number[] = [];
  for (const child of layer.children) {
    ids.push(...getAllChildIds(child));
  }
  return ids;
}

function getLayerById(layers: Layer[], id: number): Layer | undefined {
  for (const layer of layers) {
    if (layer.id === id) return layer;
    if (layer.children) {
      const found = getLayerById(layer.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function moveLayerToEnd(layers: Layer[], draggedId: number): Layer[] {
  let dragged: Layer | undefined;
  const without = removeLayerById(layers, draggedId, (l) => {
    dragged = l;
  });
  if (!dragged) return layers;
  return [...without, dragged];
}

const LayersMenu = () => {
  const { on, emit, request } = useEventBus();
  const { draggedId, handleDragStart, handleDragOver } =
    useLayerDrag();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [disabled, setDisabled] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub1 = on("workarea:initialized", () => setDisabled(false));
    const unsub2 = on("workarea:clear", () => {
      setLayers([]);
      setSelectedIds(new Set());
      setDisabled(true);
    });
    const unsub3 = on("workarea:addElement", (payload: AddElementPayload) => {
      setLayers((prev) => {
        if (getLayerById(prev, payload.elementId)) return prev;
        const newLayer: Layer = {
          id: payload.elementId,
          name: payload.layerName,
          isVisible: payload.isVisible,
          isLocked: payload.isLocked,
          children:
            payload.type === "group" ? (payload.children ?? []) : undefined,
        };
        return [...prev, newLayer];
      });
    });
    const unsub4 = on(
      "workarea:deleteElement",
      ({ elementId }: { elementId: number }) => {
        setLayers((prev) => removeLayerById(prev, elementId));
      },
    );
    const unsub5 = on(
      "workarea:selectById",
      ({ elementsId }: { elementsId: Set<number> }) => {
        setSelectedIds(new Set(elementsId));
      },
    );
    const unsub6 = on(
      "layer:setHierarchy",
      ({ hierarchy }: { hierarchy: Layer[] }) => {
        setLayers(hierarchy);
      },
    );
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
    };
  }, [on]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu, closeContextMenu]);

  const handleContextMenu = (layer: Layer) => (e: React.MouseEvent) => {
    e.preventDefault();
    const [element] = request("workarea:getElement:get", { elementId: layer.id });
    const canCrop = !!(element && element instanceof ImageElement && element.getCroppingBox()?.isCropped());
    setContextMenu({ layer, x: e.clientX, y: e.clientY, canCrop });
  };

  const emitGenerateLayerHierarchy = (currentLayers: Layer[]) => {
    emit("layer:generateHierarchy", { hierarchy: currentLayers });
  };

  const handleLayerClick =
    (layer: Layer, isGroup: boolean) => (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLButtonElement ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLLabelElement
      )
        return;
      e.stopPropagation();

      let newSelected: Set<number>;
      if (e.ctrlKey) {
        newSelected = new Set(selectedIds);
        const ids = isGroup ? getAllChildIds(layer) : [layer.id];
        for (const id of ids) {
          if (newSelected.has(id)) {
            newSelected.delete(id);
          } else {
            newSelected.add(id);
          }
        }
      } else {
        newSelected = new Set(
          isGroup ? getAllChildIds(layer) : [layer.id],
        );
      }
      setSelectedIds(newSelected);
      emit("workarea:selectById", { elementsId: newSelected });
    };

  const handleVisibilityChange =
    (layer: Layer) => (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      emit("workarea:updateElement", {
        elementId: layer.id,
        isVisible: e.target.checked,
      });
    };

  const handleLockChange =
    (layer: Layer) => (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      emit("workarea:updateElement", {
        elementId: layer.id,
        isLocked: e.target.checked,
      });
    };

  const handleFilterClick =
    (layer: Layer) => (e: React.MouseEvent) => {
      e.stopPropagation();
      emit("dialog:elementFilters:open", { layerId: layer.id });
    };

  const handleNameDoubleClick =
    (layer: Layer) => () => {
      setEditingId(layer.id);
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>(
          `#inp_layer-${layer.id}`,
        );
        if (input) {
          editInputRef.current = input;
          input.focus();
          input.select();
        }
      }, 0);
    };

  const handleNameInputKeyDown =
    (layer: Layer) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const newName = (e.target as HTMLInputElement).value;
        emit("workarea:updateElement", {
          elementId: layer.id,
          layerName: newName,
        });
        setEditingId(null);
      } else if (e.key === "Escape") {
        setEditingId(null);
      }
    };

  const handleNameInputBlur = () => {
    setEditingId(null);
  };

  const handleAddNewGroup = () => {
    emit("workarea:addGroupElement");
  };

  const handleDeleteLayer = () => {
    for (const id of selectedIds) {
      emit("workarea:deleteElement", { elementId: id });
    }
  };

  const handleDropOnList = (e: React.DragEvent<HTMLUListElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const currentDraggedId = draggedId.current;
    if (currentDraggedId !== null) {
      setLayers((prev) => {
        const result = moveLayerToEnd(prev, currentDraggedId);
        draggedId.current = null;
        emitGenerateLayerHierarchy(result);
        return result;
      });
    }
  };

  const handleDropOnItem =
    (targetId: number) => (e: React.DragEvent<HTMLLIElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const currentDraggedId = draggedId.current;
      if (currentDraggedId !== null && currentDraggedId !== targetId) {
        setLayers((prev) => {
          let dragged: Layer | undefined;
          const without = removeLayerById(prev, currentDraggedId, (l) => {
            dragged = l;
          });
          if (!dragged) return prev;
          const targetIdx = without.findIndex((l) => l.id === targetId);
          const result = [...without];
          result.splice(targetIdx, 0, dragged);
          draggedId.current = null;
          emitGenerateLayerHierarchy(result);
          return result;
        });
      }
    };

  const handleDropOnGroup =
    (groupId: number) => (e: React.DragEvent<HTMLUListElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const currentDraggedId = draggedId.current;
      if (currentDraggedId !== null && currentDraggedId !== groupId) {
        setLayers((prev) => {
          let dragged: Layer | undefined;
          const without = removeLayerById(prev, currentDraggedId, (l) => {
            dragged = l;
          });
          if (!dragged) return prev;

          const addToGroup = (layers: Layer[]): Layer[] =>
            layers.map((l) => {
              if (l.id === groupId) {
                return {
                  ...l,
                  children: [...(l.children ?? []), dragged],
                };
              }
              if (l.children) {
                return { ...l, children: addToGroup(l.children) };
              }
              return l;
            });

          const result = addToGroup(without);
          draggedId.current = null;
          emitGenerateLayerHierarchy(result);
          return result;
        });
      }
    };

  const renderLayer = (layer: Layer, isGroup: boolean): React.ReactNode => {
    const isSelected = selectedIds.has(layer.id);
    const isEditing = editingId === layer.id;
    const childListId = `ul_group-children-${layer.id}`;

    return (
      <li
        key={layer.id}
        id={`layer-${layer.id}`}
        data-id={layer.id}
        draggable
        className={`${styles.layerItem} ${isSelected ? styles.selected : ""}`}
        onClick={handleLayerClick(layer, isGroup)}
        onDragStart={handleDragStart(layer.id)}
        onDragOver={handleDragOver}
        onDrop={handleDropOnItem(layer.id)}
        onContextMenu={handleContextMenu(layer)}
      >
        <div className={styles.controls}>
          <input
            id={`inp_visibility-${layer.id}`}
            className={styles.tglCheckbox}
            type="checkbox"
            checked={layer.isVisible}
            onChange={handleVisibilityChange(layer)}
          />
          <label
            htmlFor={`inp_visibility-${layer.id}`}
            className={styles.tglLabel}
            style={
              {
                "--icon-url": `url("${ClosedEyeIcon}")`,
                "--checked-icon-url": `url("${OpenEyeIcon}")`,
              } as React.CSSProperties
            }
          />
          <input
            id={`inp_lock-${layer.id}`}
            className={styles.tglCheckbox}
            type="checkbox"
            checked={layer.isLocked}
            onChange={handleLockChange(layer)}
          />
          <label
            htmlFor={`inp_lock-${layer.id}`}
            className={styles.tglLabel}
            style={
              {
                "--icon-url": `url("${UnlockedIcon}")`,
                "--checked-icon-url": `url("${LockedIcon}")`,
              } as React.CSSProperties
            }
          />
          {!isGroup && (
            <button
              id={`btn_filters-${layer.id}`}
              className={styles.filterBtn}
              onClick={handleFilterClick(layer)}
              onDoubleClick={handleFilterClick(layer)}
            >
              <label
                className={styles.filterBtnLabel}
                style={
                  {
                    "--icon-url": `url("${FilterIcon}")`,
                  } as React.CSSProperties
                }
              />
            </button>
          )}
        </div>
        <div className={styles.layerInfo}>
          {isEditing ? (
            <input
              id={`inp_layer-${layer.id}`}
              type="text"
              className={styles.nameInput}
              defaultValue={layer.name ?? `Camada ${layer.id}`}
              onKeyDown={handleNameInputKeyDown(layer)}
              onBlur={handleNameInputBlur}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              id={`spn_layer-${layer.id}`}
              className={styles.layerName}
              onDoubleClick={handleNameDoubleClick(layer)}
            >
              {layer.name ?? `Camada ${layer.id}`}
            </span>
          )}
        </div>
        {isGroup && layer.children && layer.children.length > 0 && (
          <ul
            id={childListId}
            className={styles.groupChildren}
            onDragOver={handleDragOver}
            onDrop={handleDropOnGroup(layer.id)}
          >
            {layer.children.map((child) =>
              renderLayer(child, "children" in child && child.children !== undefined),
            )}
          </ul>
        )}
      </li>
    );
  };

  return (
    <section className={styles.section} aria-disabled={disabled || undefined}>
      <h5>Camadas:</h5>
        <ul
          id="ul_layers-list"
          className={styles.layerList}
          onDragOver={handleDragOver}
          onDrop={handleDropOnList}
        >
          {layers.map((layer) =>
            renderLayer(layer, layer.children !== undefined),
          )}
        </ul>
      <div className={styles.buttons}>
        <button
          id="btn_add-group"
          className={styles.iconBtn}
          title="Adicionar Grupo"
          onClick={handleAddNewGroup}
        >
          <span
            className={styles.iconBtnIcon}
            style={{ "--icon-url": `url("${GroupIcon}")` } as React.CSSProperties}
          />
        </button>
        <button
          id="btn_delete-layer"
          className={styles.iconBtn}
          title="Deletar Camada"
          onClick={handleDeleteLayer}
        >
          <span
            className={styles.iconBtnIcon}
            style={{ "--icon-url": `url("${TrashIcon}")` } as React.CSSProperties}
          />
        </button>
      </div>
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              emit("dialog:elementFilters:open", { layerId: contextMenu.layer.id });
              closeContextMenu();
            }}
          >
            Editar Filtros do Elemento
          </button>
          <div className={styles.contextSeparator} />
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              emit("layer:export", { layerId: contextMenu.layer.id, transparent: true });
              closeContextMenu();
            }}
          >
            Exportar Camada (fundo transparente)
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              emit("layer:export", { layerId: contextMenu.layer.id, transparent: false });
              closeContextMenu();
            }}
          >
            Exportar Camada (com canvas)
          </button>
          {contextMenu.canCrop && (
            <>
              <div className={styles.contextSeparator} />
              <button
                className={styles.contextMenuItem}
                onClick={() => {
                  emit("dialog:applyCrop:open", { layerId: contextMenu.layer.id });
                  closeContextMenu();
                }}
              >
                Aplicar Recorte
              </button>
            </>
          )}
          <div className={styles.contextSeparator} />
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              emit("workarea:deleteElement", { elementId: contextMenu.layer.id });
              closeContextMenu();
            }}
          >
            Apagar Elemento
          </button>
        </div>
      )}
    </section>
  );
};

export default LayersMenu;
