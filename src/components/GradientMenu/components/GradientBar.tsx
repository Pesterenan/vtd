import { useRef, useCallback, useEffect } from "react";
import type { IColorStop } from "src/components/types";

interface GradientBarProps {
  colorStops: IColorStop[];
  activeIndex: number | null;
  format: string;
  onAddStop: (portion: number) => void;
  onSelectStop: (index: number) => void;
  onDeleteStop: (index: number) => void;
  onDragStop: (index: number, portion: number) => void;
}

function buildGradientCss(colorStops: IColorStop[], format: string): string {
  if (colorStops.length === 0) return "none";
  const stops = colorStops
    .map(s => {
      const a = Math.round(s.alpha * 255).toString(16).padStart(2, "0");
      return `${s.color}${a} ${(s.portion * 100).toFixed(1)}%`;
    })
    .join(", ");
  switch (format) {
    case "radial": return `radial-gradient(circle, ${stops})`;
    case "conic": return `conic-gradient(${stops})`;
    default: return `linear-gradient(to right, ${stops})`;
  }
}

const GradientBar = ({
  colorStops, activeIndex, format,
  onAddStop, onSelectStop, onDeleteStop, onDragStop,
}: GradientBarProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ index: number; startX: number; startPortion: number } | null>(null);
  const gradientStyle = { background: buildGradientCss(colorStops, format) };

  const getPortionFromEvent = useCallback((clientX: number): number => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleBarClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== barRef.current) return;
    onAddStop(getPortionFromEvent(e.clientX));
  }, [getPortionFromEvent, onAddStop]);

  const handleIndicatorMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectStop(index);
      dragging.current = {
        index,
        startX: e.clientX,
        startPortion: colorStops[index]?.portion ?? 0,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const deltaX = ev.clientX - dragging.current.startX;
        const bar = barRef.current;
        if (!bar) return;
        const deltaPortion = deltaX / bar.getBoundingClientRect().width;
        const newPortion = Math.max(0, Math.min(1, dragging.current.startPortion + deltaPortion));
        onDragStop(dragging.current.index, newPortion);
      };

      const handleMouseUp = () => {
        dragging.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [colorStops, onSelectStop, onDragStop],
  );

  useEffect(() => {
    return () => {
      dragging.current = null;
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="gradientBar"
      style={{ ...gradientStyle, position: "relative", height: "2rem", borderRadius: "0.25rem", cursor: "pointer" }}
      onClick={handleBarClick}
    >
      {colorStops.map((stop, i) => (
        <div
          key={i}
          data-index={i}
          className={`colorStop ${i === activeIndex ? "active" : ""}`}
          style={{
            position: "absolute",
            top: 0,
            left: `calc(${stop.portion * 100}% - 0.375rem)`,
            width: "0.75rem",
            height: "100%",
            backgroundColor: stop.color,
            border: i === activeIndex ? "2px solid #fff" : "1px solid #888",
            borderRadius: "0.125rem",
            cursor: "grab",
            boxSizing: "border-box",
            zIndex: i === activeIndex ? 2 : 1,
          }}
          onMouseDown={(e) => handleIndicatorMouseDown(i, e)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDeleteStop(i);
          }}
        />
      ))}
    </div>
  );
};

export default GradientBar;
