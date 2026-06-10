import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./DialogBase.module.css";

interface DialogBaseProps {
  isDraggable?: boolean;
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
}

const DialogBase = ({ isOpen, isDraggable = false, onClose, title, children }: DialogBaseProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleDragging = (e: React.MouseEvent) => {
    const el = dialogRef.current;
    if (!el) return;
    e.preventDefault();

    const rect = el.getBoundingClientRect();

    el.style.position = "fixed";
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const onMouseMove = (event: MouseEvent) => {
      const maxLeft = window.innerWidth - el.offsetWidth;
      const maxTop = window.innerHeight - el.offsetHeight;
      el.style.left = `${Math.max(0, Math.min(maxLeft, event.clientX - offsetX))}px`;
      el.style.top = `${Math.max(0, Math.min(maxTop, event.clientY - offsetY))}px`;
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 onMouseDown={isDraggable ? handleDragging : undefined}>{title}</h3>
        {children}
      </div>
    </div>,
    document.body,
  );
};

export default DialogBase;
