import { ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ClipboardCopy, RotateCcw, Download, Copy, Undo2 } from "lucide-react";
import type { PreviewBackground } from "@/types/perspective";

interface SvgPerspectivePanelProps {
  hasSvg: boolean;
  metadata: { width: number; height: number; shapes: number } | null;
  quality: number;
  onQualityChange: (value: number) => void;
  showGrid: boolean;
  onToggleGrid: (value: boolean) => void;
  snapToGrid: boolean;
  onToggleSnap: (value: boolean) => void;
  onSvgContent: (content: string) => void;
  onResetCorners: () => void;
  onExportSvg: () => void;
  onCopySvg: () => void;
  background: PreviewBackground;
  onBackgroundChange: (value: PreviewBackground) => void;
  customBackground: string;
  onCustomBackgroundChange: (value: string) => void;
  onResetView: () => void;
  children?: ReactNode;
}

export const SvgPerspectivePanel = ({
  hasSvg,
  metadata,
  quality,
  onQualityChange,
  showGrid,
  onToggleGrid,
  snapToGrid,
  onToggleSnap,
  onSvgContent,
  onResetCorners,
  onExportSvg,
  onCopySvg,
  background,
  onBackgroundChange,
  customBackground,
  onCustomBackgroundChange,
  onResetView,
  children,
}: SvgPerspectivePanelProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result?.toString();
      if (text?.includes("<svg")) {
        onSvgContent(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboard = event.clipboardData.getData("text/plain");
    if (clipboard?.includes("<svg")) {
      onSvgContent(clipboard);
    }
  };

  const handleClipboardLoad = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.includes("<svg")) {
        onSvgContent(text);
      }
    } catch {
      // ignore – browser blocked clipboard read
    }
  };

  return (
    <div className="w-80 bg-panel border-r border-border h-full flex flex-col p-6 gap-6 overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold">Perspective</h2>
        <p className="text-sm text-muted-foreground">Paste or import SVGs and warp them in perspective.</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-3 p-6 text-center text-sm transition-colors ${
          dragActive ? "border-primary bg-primary/10" : "border-border bg-secondary/20"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
      >
        <Upload className="h-6 w-6 opacity-60" />
        <p className="text-muted-foreground">Drop an SVG, click to browse, or paste (⌘/Ctrl + V)</p>
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          Browse…
        </Button>
        <Input
          type="file"
          accept=".svg,image/svg+xml"
          ref={inputRef}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button variant="ghost" size="sm" onClick={handleClipboardLoad}>
          <ClipboardCopy className="h-4 w-4 mr-2" />
          Use clipboard
        </Button>
      </div>

      {metadata && (
        <div className="bg-secondary/40 rounded-md p-4 text-sm space-y-1">
          <p className="font-semibold">Artwork details</p>
          <p>Size: {metadata.width.toFixed(0)} × {metadata.height.toFixed(0)}</p>
          <p>Shapes: {metadata.shapes}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Subdivision detail</Label>
          <span className="text-xs text-muted-foreground">{quality}</span>
        </div>
        <Slider
          min={2}
          max={10}
          step={1}
          value={[quality]}
          onValueChange={(value) => onQualityChange(value[0])}
        />
        <p className="text-xs text-muted-foreground">
          Higher values increase polygon detail when flattening curves for the perspective warp.
        </p>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Show grid</p>
            <p className="text-xs text-muted-foreground">Helpful for alignment</p>
          </div>
          <Switch checked={showGrid} onCheckedChange={onToggleGrid} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Snap handles</p>
            <p className="text-xs text-muted-foreground">Round to grid while dragging</p>
          </div>
          <Switch checked={snapToGrid} onCheckedChange={onToggleSnap} />
        </div>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Preview background</Label>
          <Select value={background} onValueChange={(value: PreviewBackground) => onBackgroundChange(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Background" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checker">Checkerboard</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="transparent">Transparent</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {background === "custom" && (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customBackground}
              onChange={(event) => onCustomBackgroundChange(event.target.value)}
              className="w-12 h-10 rounded border border-border cursor-pointer"
            />
            <Input
              value={customBackground}
              onChange={(event) => onCustomBackgroundChange(event.target.value)}
              className="h-10"
            />
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onResetView} disabled={!hasSvg}>
          <Undo2 className="h-4 w-4 mr-2" />
          Reset view
        </Button>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" disabled={!hasSvg} onClick={onResetCorners}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset corners
        </Button>
        <div className="flex gap-2">
          <Button className="flex-1" disabled={!hasSvg} onClick={onExportSvg}>
            <Download className="h-4 w-4 mr-2" />
            Export SVG
          </Button>
          <Button className="flex-1" disabled={!hasSvg} variant="secondary" onClick={onCopySvg}>
            <Copy className="h-4 w-4 mr-2" />
            Copy SVG
          </Button>
        </div>
      </div>

      {children && (
        <div className="border-t border-border pt-4">{children}</div>
      )}
    </div>
  );
};
