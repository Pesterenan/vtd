import { useRef, useCallback } from "react";

export function useLayerDrag() {
  const draggedId = useRef<number | null>(null);

  const handleDragStart = useCallback(
    (id: number) => (e: React.DragEvent<HTMLLIElement>) => {
      e.stopPropagation();
      draggedId.current = id;
      e.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const resetDrag = useCallback(() => {
    draggedId.current = null;
  }, []);

  return { draggedId, handleDragStart, handleDragOver, resetDrag };
}
