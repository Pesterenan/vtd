import * as React from "react";
import { useEventBus } from "src/hooks/useEventBus";
import styles from "./ContextMenu.module.css";
import type { Position } from "../types";
import type { ContextMenuItem } from "src/utils/eventBus";

interface ContextMenuState {
  position: Position;
  items: ContextMenuItem[];
}

const ContextMenu = () => {
  const { on } = useEventBus();
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState | null>(null);
  const contextMenuRef = React.useRef<HTMLDivElement | null>(null);

  const closeContextMenu = React.useCallback(() => {
    setContextMenu(null);
  }, []);

  React.useEffect(() => {
    const unsubOpen = on("workarea:contextMenu:open", ({ position, items }) => {
      // clamp para não sair da viewport
      const menuW = 200; // min-width + padding estimado
      const menuH = items.length * 28 + 12;
      const x = Math.min(position.x, window.innerWidth - menuW - 8);
      const y = Math.min(position.y, window.innerHeight - menuH - 8);
      setContextMenu({ position: { x, y }, items });
    });
    const unsubClose = on("workarea:contextMenu:close", () => {
      setContextMenu(null);
    });
    return () => {
      unsubOpen();
      unsubClose();
    };
  }, [on]);

  React.useEffect(() => {
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

  if (!contextMenu) return null;

  return (
    <>
      <div className={styles.menuBackdrop} onClick={closeContextMenu} />
      <div
        ref={contextMenuRef}
        className={styles.contextMenu}
        style={{ top: contextMenu.position.y, left: contextMenu.position.x }}
      >
        {contextMenu.items.map((item, idx) => {
          if (item.type === "divider") {
            return <div key={`sep-${idx}`} className={styles.contextSeparator} />;
          }
          return (
            <button
              key={item.id}
              className={`${styles.contextMenuItem} ${item.active ? styles.contextMenuItemActive : ""}`}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.action();
                closeContextMenu();
              }}
            >
              {item.icon ? (
                <span
                  className={styles.icon}
                  style={{ "--icon-url": `url("${item.icon}")` } as React.CSSProperties}
                />
              ) : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default ContextMenu;
