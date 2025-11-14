import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvasProps {
  image: HTMLImageElement | null;
  ditheredCanvas: HTMLCanvasElement | null;
}

export const Canvas = ({ image, ditheredCanvas }: CanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.25, Math.min(4, prev + delta)));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-canvas">
      <div className="border-b border-border p-4 flex items-center justify-between bg-panel">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 0.25}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 4}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center",
          }}
        >
          {ditheredCanvas ? (
            <canvas
              ref={(canvas) => {
                if (canvas && ditheredCanvas) {
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    canvas.width = ditheredCanvas.width;
                    canvas.height = ditheredCanvas.height;
                    ctx.drawImage(ditheredCanvas, 0, 0);
                  }
                }
              }}
              className="shadow-2xl"
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No image loaded</p>
              <p className="text-sm mt-2">Paste an image (Cmd/Ctrl + V) to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
