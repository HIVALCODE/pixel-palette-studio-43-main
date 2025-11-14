import { CSSProperties, useEffect, useId, useRef, useState } from "react";
import { Point, ParsedSvg } from "@/utils/perspective";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { PreviewBackground } from "@/types/perspective";

interface PerspectiveWorkspaceProps {
  parsed: ParsedSvg | null;
  corners: Point[];
  onCornersChange: (next: Point[]) => void;
  showGrid: boolean;
  snapToGrid: boolean;
  paths: { id: string; d: string; attributes: Record<string, string> }[];
  zoom: number;
  onZoomChange: (value: number) => void;
  pan: { x: number; y: number };
  onPanChange: (value: { x: number; y: number }) => void;
  onResetView: () => void;
  background: PreviewBackground;
  customBackground: string;
}

export const PerspectiveWorkspace = ({
  parsed,
  corners,
  onCornersChange,
  showGrid,
  snapToGrid,
  paths,
  zoom,
  onZoomChange,
  pan,
  onPanChange,
  onResetView,
  background,
  customBackground,
}: PerspectiveWorkspaceProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  const patternId = useId();
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, pointerX: 0, pointerY: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      setSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (activeHandle === null) return;
    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      if (!parsed || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const { scale, offsetX, offsetY } = getScale(parsed, size, zoom);
      const x = (event.clientX - rect.left - offsetX - pan.x) / scale;
      const y = (event.clientY - rect.top - offsetY - pan.y) / scale;
      const clampedX = Math.min(Math.max(0, x), parsed.width);
      const clampedY = Math.min(Math.max(0, y), parsed.height);
      const snapValue = snapToGrid ? snapPoint({ x: clampedX, y: clampedY }, parsed) : { x: clampedX, y: clampedY };
      const next = corners.slice();
      next[activeHandle] = snapValue;
      onCornersChange(next);
    };

    const handlePointerUp = () => setActiveHandle(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activeHandle, parsed, size, snapToGrid, corners, onCornersChange, pan, zoom]);

  const handleBackgroundPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!parsed) return;
    if (event.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = {
      x: pan.x,
      y: pan.y,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    const deltaX = event.clientX - panStartRef.current.pointerX;
    const deltaY = event.clientY - panStartRef.current.pointerY;
    onPanChange({
      x: panStartRef.current.x + deltaX,
      y: panStartRef.current.y + deltaY,
    });
  };

  const stopPanning = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (event: WheelEvent) => {
      if (!parsed) return;
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      onZoomChange(Math.max(0.25, Math.min(4, zoom + delta)));
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [parsed, zoom, onZoomChange]);

  const { scale, offsetX, offsetY } = getScale(parsed, size, zoom);
  const backgroundStyle = getBackgroundStyle(background, customBackground);

  const borderColor = getBorderColor(background, customBackground);

  return (
    <div
      className="flex-1 relative overflow-hidden"
      ref={containerRef}
      style={{
        ...backgroundStyle,
        cursor: parsed ? (isPanning ? "grabbing" : "grab") : "default",
      }}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopPanning}
      onPointerLeave={(event) => {
        if (isPanning) stopPanning(event);
      }}
    >
      {parsed && (
        <div
          className="absolute top-4 right-4 flex items-center gap-2 z-20"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.1))}
            disabled={zoom <= 0.25}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium px-2 py-1 rounded bg-background/80 border border-border">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onZoomChange(Math.min(4, zoom + 0.1))}
            disabled={zoom >= 4}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onResetView}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}
      {parsed ? (
        <>
          <svg
            className="absolute"
            style={{
              width: parsed.width * scale,
              height: parsed.height * scale,
              left: offsetX + pan.x,
              top: offsetY + pan.y,
            }}
            viewBox={`0 0 ${parsed.width} ${parsed.height}`}
          >
            {showGrid && (
              <>
                <defs>
                  <pattern id={patternId} width={parsed.width / 10} height={parsed.height / 10} patternUnits="userSpaceOnUse">
                    <path d={`M ${parsed.width / 10} 0 L 0 0 0 ${parsed.height / 10}`} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect
                  width={parsed.width}
                  height={parsed.height}
                  fill={`url(#${patternId})`}
                />
              </>
            )}
            {paths.map((path) => (
              <path key={path.id} d={path.d} {...path.attributes} />
            ))}
          </svg>
          <svg
            className="absolute pointer-events-none"
            style={{
              width: parsed.width * scale,
              height: parsed.height * scale,
              left: offsetX + pan.x,
              top: offsetY + pan.y,
            }}
            viewBox={`0 0 ${parsed.width} ${parsed.height}`}
          >
            <path
              d={cornerPath(corners)}
              fill="none"
              stroke="#60a5fa"
              strokeWidth={1}
            />
            <rect
              x={0.75}
              y={0.75}
              width={parsed.width - 1.5}
              height={parsed.height - 1.5}
              fill="none"
              stroke={borderColor}
              strokeWidth={1.25}
            />
          </svg>
          {corners.map((corner, index) => (
            <button
              type="button"
              key={index}
              className="absolute w-4 h-4 rounded-full border-2 border-background bg-primary shadow"
              style={{
                left: offsetX + pan.x + corner.x * scale - 8,
                top: offsetY + pan.y + corner.y * scale - 8,
                cursor: "grab",
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setActiveHandle(index);
              }}
            />
          ))}
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground px-10">
          <p className="text-lg font-semibold mb-2">Load an SVG to begin</p>
          <p className="text-sm">Imported artwork will appear here with draggable corner handles for the perspective warp.</p>
        </div>
      )}
    </div>
  );
};

function getScale(parsed: ParsedSvg | null, size: { width: number; height: number }, zoom: number) {
  if (!parsed) return { scale: 1, offsetX: 0, offsetY: 0 };
  const scale = Math.min(
    size.width / parsed.width || 1,
    size.height / parsed.height || 1
  ) * zoom;
  const offsetX = (size.width - parsed.width * scale) / 2;
  const offsetY = (size.height - parsed.height * scale) / 2;
  return { scale, offsetX, offsetY };
}

function snapPoint(point: Point, parsed: ParsedSvg): Point {
  const step = Math.min(parsed.width, parsed.height) / 20;
  return {
    x: Math.round(point.x / step) * step,
    y: Math.round(point.y / step) * step,
  };
}

function cornerPath(points: Point[]) {
  return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} Z`;
}

function getBorderColor(type: PreviewBackground, custom: string): string {
  const lightStroke = "rgba(255,255,255,0.65)";
  const darkStroke = "rgba(26,32,44,0.85)";

  switch (type) {
    case "dark":
    case "checker":
    case "transparent":
      return lightStroke;
    case "light":
      return darkStroke;
    case "custom": {
      const brightness = parseHexBrightness(custom);
      if (brightness === null) return lightStroke;
      return brightness > 180 ? darkStroke : lightStroke;
    }
    default:
      return lightStroke;
  }
}

function parseHexBrightness(value: string): number | null {
  if (!value) return null;
  const hex = value.trim().replace("#", "");
  if (!(hex.length === 3 || hex.length === 6)) return null;
  const normalized = hex.length === 3
    ? hex.split("").map((char) => char + char).join("")
    : hex;
  const int = parseInt(normalized, 16);
  if (Number.isNaN(int)) return null;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getBackgroundStyle(type: PreviewBackground, custom: string): CSSProperties {
  switch (type) {
    case "dark":
      return { backgroundColor: "#0f0f11" };
    case "light":
      return { backgroundColor: "#f4f4f5" };
    case "transparent":
      return { backgroundColor: "transparent" };
    case "custom":
      return { backgroundColor: custom || "#1e1e1e" };
    case "checker":
    default:
      return checkerBackground();
  }
}

function checkerBackground(): CSSProperties {
  const size = 20;
  const colorA = "rgba(255,255,255,0.12)";
  const colorB = "rgba(0,0,0,0.12)";
  return {
    backgroundColor: "#1f1f1f",
    backgroundImage: `
      linear-gradient(45deg, ${colorA} 25%, transparent 25%), 
      linear-gradient(-45deg, ${colorA} 25%, transparent 25%), 
      linear-gradient(45deg, transparent 75%, ${colorA} 75%), 
      linear-gradient(-45deg, ${colorA} 75%, ${colorB} 75%)`,
    backgroundSize: `${size}px ${size}px`,
    backgroundPosition: `0 0, 0 ${size / 2}px, ${size / 2}px -${size / 2}px, -${size / 2}px 0px`,
  };
}
