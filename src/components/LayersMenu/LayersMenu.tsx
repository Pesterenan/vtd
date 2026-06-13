import { useCallback, useEffect, useRef, useState } from "react";
import { useEventBus } from "src/hooks/useEventBus";
import { useLayerDrag } from "src/hooks/useLayerDrag";
import type { Layer } from "../types";
import type { AddElementPayload } from "src/utils/eventBus";
import { ImageElement } from "../elements/imageElement";
import styles from "./LayersMenu.module.css";

import GroupIcon from "src/assets/icons/group.svg";
import TrashIcon from "src/assets/icons/trash.svg";
import { renderLayer } from "./components/LayerItem";

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

function isDescendantOf(
  layers: Layer[],
  ancestorId: number,
  targetId: number,
): boolean {
  const ancestor = getLayerById(layers, ancestorId);
  if (!ancestor || !ancestor.children) return false;
  return getLayerById(ancestor.children, targetId) !== undefined;
}

function moveLayerToEnd(layers: Layer[], draggedId: number): Layer[] {
  let dragged: Layer | undefined;
  const without = removeLayerById(layers, draggedId, (l) => {
    dragged = l;
  });
  if (!dragged) return layers;
  return [...without, dragged];
}

function insertLayerNearTarget(
  layers: Layer[],
  targetId: number,
  dragged: Layer,
  position: "before" | "after" = "before",
): Layer[] | null {
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].id === targetId) {
      const result = [...layers];
      result.splice(position === "after" ? i + 2 : i, 0, dragged);
      return result;
    }
    if (layers[i]?.children && layers[i].children.length > 0) {
      const result = insertLayerNearTarget(
        layers[i].children,
        targetId,
        dragged,
        position,
      );
      if (result) {
        const newLayers = [...layers];
        newLayers[i] = { ...newLayers[i], children: result };
        return newLayers;
      }
    }
  }
  return null;
}

function getAllGroupIds(layers: Layer[]): number[] {
  const ids: number[] = [];
  for (const layer of layers) {
    if (layer.children !== undefined) {
      ids.push(layer.id);
      ids.push(...getAllGroupIds(layer.children ?? []));
    }
  }
  return ids;
}

const LayersMenu = () => {
  const { on, emit, request } = useEventBus();
  const { draggedId, handleDragStart, handleDragOver } = useLayerDrag();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [disabled, setDisabled] = useState(true);
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [hoverTarget, setHoverTarget] = useState<{
    targetId: number;
    position: "before" | "after";
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const dropPositionRef = useRef<"before" | "after">("before");
  const seenGroupIds = useRef<Set<number>>(new Set());

  const handleItemDragOver = (targetId: number) => (e: React.DragEvent) => {
    handleDragOver(e);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const position = y < rect.height / 2 ? "before" : "after";
    dropPositionRef.current = position;
    setHoverTarget((prev) => {
      if (prev?.targetId === targetId && prev?.position === position)
        return prev;
      return { targetId, position };
    });
  };

  const handleItemDragLeave = (targetId: number) => () => {
    setHoverTarget((prev) => (prev?.targetId === targetId ? null : prev));
  };

  const handleOnDrop = (event: React.DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setHoverTarget(null);

    const targetId = Number(event.currentTarget.dataset.id);
    const currentDraggedId = draggedId.current;
    if (
      currentDraggedId === null ||
      isNaN(targetId) ||
      targetId === currentDraggedId
    )
      return;
    draggedId.current = null;

    setLayers((prev) => {
      if (isDescendantOf(prev, currentDraggedId, targetId)) return prev;

      let dragged: Layer | undefined;
      const without = removeLayerById(prev, currentDraggedId, (l) => {
        dragged = l;
      });
      if (!dragged) return prev;

      const targetLayer = getLayerById(without, targetId);
      if (targetLayer?.children !== undefined) {
        const addToGroup = (layers: Layer[]): Layer[] =>
          layers.map((l) => {
            if (l.id === targetId)
              return { ...l, children: [...(l.children ?? []), dragged] };
            if (l.children) return { ...l, children: addToGroup(l.children) };
            return l;
          });
        const result = addToGroup(without);
        emitGenerateLayerHierarchy(result);
        return result;
      }

      const position = dropPositionRef.current;
      const result = insertLayerNearTarget(
        without,
        targetId,
        dragged,
        position,
      );
      if (result) {
        emitGenerateLayerHierarchy(result);
        return result;
      }

      emitGenerateLayerHierarchy(without);
      return without;
    });
  };

  const handleToggleCollapse = (layerId: number) => (collapsed: boolean) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (collapsed) {
        next.add(layerId);
      } else {
        next.delete(layerId);
      }
      return next;
    });
  };

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
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
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

  useEffect(() => {
    const groupIds = getAllGroupIds(layers);
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      for (const id of groupIds) {
        if (!seenGroupIds.current.has(id)) {
          seenGroupIds.current.add(id);
          if (!prev.has(id)) {
            next.add(id);
          }
        }
      }
      return next;
    });
  }, [layers]);

  const handleContextMenu = (layer: Layer) => (e: React.MouseEvent) => {
    e.preventDefault();
    const [element] = request("workarea:getElement:get", {
      elementId: layer.id,
    });
    const canCrop = !!(
      element &&
      element instanceof ImageElement &&
      element.getCroppingBox()?.isCropped()
    );
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
        newSelected = new Set(isGroup ? getAllChildIds(layer) : [layer.id]);
      }
      setSelectedIds(newSelected);
      emit("workarea:selectById", { elementsId: newSelected });
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

  return (
    <section className={styles.section} aria-disabled={disabled || undefined}>
      <h5>Camadas:</h5>
      <ul
        id="ul_layers-list"
        className={styles.layerList}
        onDragOver={handleDragOver}
        onDrop={handleDropOnList}
      >
        {layers.map((layer) => {
          return renderLayer(
            layer,
            handleDragStart,
            handleOnDrop,
            handleDragOver,
            handleLayerClick,
            collapsedIds,
            handleToggleCollapse,
            handleItemDragOver,
            handleItemDragLeave,
            hoverTarget,
            selectedIds,
          );
        })}
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
            style={
              { "--icon-url": `url("${GroupIcon}")` } as React.CSSProperties
            }
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
            style={
              { "--icon-url": `url("${TrashIcon}")` } as React.CSSProperties
            }
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
              emit("dialog:elementFilters:open", {
                layerId: contextMenu.layer.id,
              });
              closeContextMenu();
            }}
          >
            Editar Filtros do Elemento
          </button>
          <div className={styles.contextSeparator} />
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              emit("layer:export", {
                layerId: contextMenu.layer.id,
                transparent: true,
              });
              closeContextMenu();
            }}
          >
            Exportar Camada (fundo transparente)
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              emit("layer:export", {
                layerId: contextMenu.layer.id,
                transparent: false,
              });
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
                  emit("dialog:applyCrop:open", {
                    layerId: contextMenu.layer.id,
                  });
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
              emit("workarea:deleteElement", {
                elementId: contextMenu.layer.id,
              });
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
