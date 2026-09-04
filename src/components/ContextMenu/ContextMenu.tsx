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
    const unsub = on("workarea:contextMenu:open", ({ position, items }) => {
      setContextMenu({ position, items });
    });

    return unsub;
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

  return contextMenu ? (
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
            className={styles.contextMenuItem}
            disabled={item.disabled}
            onClick={() => {
              item.action();
              closeContextMenu();
            }}
          >
            {item.icon ? <span className={styles.icon} style={{ "--icon-url": `url("${item.icon}")`} as React.CSSProperties} /> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  ) : null;
};

export default ContextMenu;
