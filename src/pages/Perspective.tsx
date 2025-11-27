import { useCallback, useEffect, useMemo, useState } from "react";
import { SvgPerspectivePanel } from "@/components/perspective/SvgPerspectivePanel";
import { PerspectiveWorkspace } from "@/components/perspective/PerspectiveWorkspace";
import { buildSvgMarkup, computeHomography, parseSvgMarkup, ParsedSvg, Point, warpShapes } from "@/utils/perspective";
import { toast } from "@/hooks/use-toast";
import type { PreviewBackground } from "@/types/perspective";
import { ToolPresetManager } from "@/components/ToolPresetManager";

type PerspectivePresetState = {
  quality: number;
  showGrid: boolean;
  snapToGrid: boolean;
  zoom: number;
  pan: { x: number; y: number };
  background: PreviewBackground;
  customBackground: string;
};

const defaultCorners = (width: number, height: number): Point[] => ([
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height },
]);

const Perspective = () => {
  const [quality, setQuality] = useState(4);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [parsed, setParsed] = useState<ParsedSvg | null>(null);
  const [corners, setCorners] = useState<Point[]>(defaultCorners(100, 100));
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [background, setBackground] = useState<PreviewBackground>("checker");
  const [customBackground, setCustomBackground] = useState("#1f1f1f");

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const processMarkup = useCallback((markup: string) => {
    if (!markup.includes("<svg")) {
      toast({
        title: "Invalid SVG",
        description: "Pasted content does not contain an <svg> element.",
        variant: "destructive",
      });
      return;
    }
    try {
      const next = parseSvgMarkup(markup, quality);
      setSvgMarkup(markup);
      setParsed(next);
      setCorners(defaultCorners(next.width, next.height));
      resetView();
      toast({
        title: "SVG loaded",
        description: "Ready to adjust perspective.",
      });
    } catch (error) {
      toast({
        title: "Failed to parse SVG",
        description: error instanceof Error ? error.message : "Unknown error.",
        variant: "destructive",
      });
    }
  }, [quality, resetView]);

  useEffect(() => {
    if (!svgMarkup) return;
    try {
      const next = parseSvgMarkup(svgMarkup, quality);
      setParsed(next);
      setCorners((prev) => {
        if (prev.length !== 4) return defaultCorners(next.width, next.height);
        return prev.map((corner) => ({
          x: Math.min(Math.max(0, corner.x), next.width),
          y: Math.min(Math.max(0, corner.y), next.height),
        }));
      });
    } catch {
      // ignore – handled on manual parse
    }
  }, [quality, svgMarkup]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text/plain");
      if (text?.includes("<svg")) {
        event.preventDefault();
        processMarkup(text);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processMarkup]);

  const warpedPaths = useMemo(() => {
    if (!parsed) return [];
    const source = defaultCorners(parsed.width, parsed.height);
    const homography = computeHomography(source, corners);
    return warpShapes(parsed.shapes, homography);
  }, [parsed, corners]);

  const handleExport = () => {
    if (!parsed || !warpedPaths.length) {
      toast({
        title: "Nothing to export",
        description: "Import an SVG and adjust it first.",
      });
      return;
    }
    const output = buildSvgMarkup(parsed, warpedPaths);
    const blob = new Blob([output], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "perspective.svg";
    link.click();
    URL.revokeObjectURL(url);
    toast({
      title: "SVG exported",
      description: "Perspective warp saved.",
    });
  };

  const handleCopy = async () => {
    if (!parsed || !warpedPaths.length) return;
    try {
      const output = buildSvgMarkup(parsed, warpedPaths);
      await navigator.clipboard.writeText(output);
      toast({
        title: "Copied",
        description: "Warped SVG copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  const hasSvg = Boolean(parsed && warpedPaths.length);
  const presetState: PerspectivePresetState = {
    quality,
    showGrid,
    snapToGrid,
    zoom,
    pan,
    background,
    customBackground,
  };

  const handleApplyPresetState = (state: PerspectivePresetState) => {
    setQuality(state.quality);
    setShowGrid(state.showGrid);
    setSnapToGrid(state.snapToGrid);
    setZoom(state.zoom);
    setPan({ ...state.pan });
    setBackground(state.background);
    setCustomBackground(state.customBackground);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <SvgPerspectivePanel
        hasSvg={hasSvg}
        metadata={parsed ? { width: parsed.width, height: parsed.height, shapes: parsed.shapes.length } : null}
        quality={quality}
        onQualityChange={setQuality}
        showGrid={showGrid}
        onToggleGrid={setShowGrid}
        snapToGrid={snapToGrid}
        onToggleSnap={setSnapToGrid}
        onSvgContent={processMarkup}
        onResetCorners={() => {
          if (!parsed) return;
          setCorners(defaultCorners(parsed.width, parsed.height));
        }}
        onExportSvg={handleExport}
        onCopySvg={handleCopy}
        background={background}
        onBackgroundChange={setBackground}
        customBackground={customBackground}
        onCustomBackgroundChange={setCustomBackground}
        onResetView={resetView}
      >
        <ToolPresetManager<PerspectivePresetState>
          toolId="perspective"
          currentState={presetState}
          onApply={handleApplyPresetState}
          disabled={!hasSvg}
        />
      </SvgPerspectivePanel>
      <PerspectiveWorkspace
        parsed={parsed}
        corners={corners}
        onCornersChange={setCorners}
        showGrid={showGrid}
        snapToGrid={snapToGrid}
        paths={warpedPaths}
        zoom={zoom}
        onZoomChange={setZoom}
        pan={pan}
        onPanChange={setPan}
        onResetView={resetView}
        background={background}
        customBackground={customBackground}
      />
    </div>
  );
};

export default Perspective;
