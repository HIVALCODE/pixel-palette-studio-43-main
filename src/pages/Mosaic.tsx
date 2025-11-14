import { useState, useEffect } from "react";
import { Canvas } from "@/components/Canvas";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyImageAdjustments } from "@/utils/imageAdjustments";
import { applyMosaic, generateMosaicSVG, MosaicSettings, ColorMethod } from "@/utils/mosaic";
import { Download, Copy, Save } from "lucide-react";
import { toast } from "sonner";
import { useImage } from "@/contexts/ImageContext";
import { useGallery } from "@/contexts/GalleryContext";

export default function Mosaic() {
  const { image } = useImage();
  const { saveImage } = useGallery();
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);
  
  // Image adjustments
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [threshold, setThreshold] = useState(128);
  
  // Mosaic settings
  const [columns, setColumns] = useState(20);
  const [rows, setRows] = useState(20);
  const [cellWidthPx, setCellWidthPx] = useState(0);
  const [cellHeightPx, setCellHeightPx] = useState(0);
  const [colorMethod, setColorMethod] = useState<ColorMethod>('average');

  // Process image
  useEffect(() => {
    if (!image) return;

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply adjustments
    const adjusted = applyImageAdjustments(imageData, brightness, contrast, gamma, threshold);

    // Apply mosaic effect
    const settings: MosaicSettings = {
      columns,
      rows,
      cellWidthPx,
      cellHeightPx,
      colorMethod
    };
    
    const mosaicData = applyMosaic(adjusted, settings);

    ctx.putImageData(mosaicData, 0, 0);
    setProcessedCanvas(canvas);
  }, [image, brightness, contrast, gamma, threshold, columns, rows, cellWidthPx, cellHeightPx, colorMethod]);

  const handleExportPNG = () => {
    if (!processedCanvas) return;
    const link = document.createElement("a");
    link.download = "mosaic.png";
    link.href = processedCanvas.toDataURL();
    link.click();
    toast.success("PNG exported successfully");
  };

  const handleExportSVG = () => {
    if (!processedCanvas) return;
    const settings: MosaicSettings = {
      columns,
      rows,
      cellWidthPx,
      cellHeightPx,
      colorMethod
    };
    const svg = generateMosaicSVG(processedCanvas, settings);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.download = "mosaic.svg";
    link.href = URL.createObjectURL(blob);
    link.click();
    toast.success("SVG exported successfully");
  };

  const handleCopyPNG = async () => {
    if (!processedCanvas) return;
    try {
      const blob = await new Promise<Blob>((resolve) => {
        processedCanvas.toBlob((blob) => resolve(blob!));
      });
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast.success("PNG copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy PNG");
    }
  };

  const handleCopySVG = async () => {
    if (!processedCanvas) return;
    try {
      const settings: MosaicSettings = {
        columns,
        rows,
        cellWidthPx,
        cellHeightPx,
        colorMethod
      };
      const svg = generateMosaicSVG(processedCanvas, settings);
      await navigator.clipboard.writeText(svg);
      toast.success("SVG copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy SVG");
    }
  };

  const handleResetAdjustments = () => {
    setBrightness(0);
    setContrast(0);
    setGamma(1);
    setThreshold(128);
    setColumns(20);
    setRows(20);
    setCellWidthPx(0);
    setCellHeightPx(0);
    setColorMethod('average');
    toast.success("Settings reset");
  };

  const handleSaveToGallery = () => {
    if (!processedCanvas) return;
    const dataUrl = processedCanvas.toDataURL('image/png');
    const metadata = {
      brightness,
      contrast,
      gamma,
      threshold,
      columns,
      rows,
      cellWidthPx,
      cellHeightPx,
      colorMethod,
    };
    saveImage(dataUrl, 'mosaic', metadata);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    setValue: (val: number) => void,
    currentValue: number,
    min: number = -Infinity,
    max: number = Infinity,
    normalStep: number = 1,
    shiftStep: number = 50
  ) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? shiftStep : normalStep;
      const delta = e.key === 'ArrowUp' ? step : -step;
      const newValue = Math.min(max, Math.max(min, currentValue + delta));
      setValue(newValue);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-80 bg-panel border-r border-border overflow-y-auto p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Image Adjustments</h3>
            
            <div className="space-y-2">
              <Label>Brightness: {brightness}</Label>
              <Slider
                value={[brightness]}
                onValueChange={(value) => setBrightness(value[0])}
                min={-100}
                max={100}
                step={1}
              />
              <Input
                type="number"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, setBrightness, brightness, -100, 100, 1, 50)}
                min={-100}
                max={100}
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <Label>Contrast: {contrast}</Label>
              <Slider
                value={[contrast]}
                onValueChange={(value) => setContrast(value[0])}
                min={-100}
                max={100}
                step={1}
              />
              <Input
                type="number"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, setContrast, contrast, -100, 100, 1, 50)}
                min={-100}
                max={100}
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <Label>Gamma: {gamma.toFixed(2)}</Label>
              <Slider
                value={[gamma]}
                onValueChange={(value) => setGamma(value[0])}
                min={0.1}
                max={3}
                step={0.1}
              />
              <Input
                type="number"
                value={gamma}
                onChange={(e) => setGamma(Number(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, setGamma, gamma, 0.1, 3, 0.1, 0.5)}
                min={0.1}
                max={3}
                step={0.1}
                className="mt-1"
              />
            </div>

            <div className="space-y-2">
              <Label>Threshold: {threshold}</Label>
              <Slider
                value={[threshold]}
                onValueChange={(value) => setThreshold(value[0])}
                min={0}
                max={255}
                step={1}
              />
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, setThreshold, threshold, 0, 255, 1, 50)}
                min={0}
                max={255}
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Mosaic Settings</h3>
            <p className="text-xs text-muted-foreground">Cell Width/Height (px) takes priority when set. Set to 0 to use Columns/Rows instead.</p>
            
            <div className="space-y-2">
              <Label>Columns</Label>
              <Input
                type="number"
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, setColumns, columns, 1, Infinity, 1, 50)}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Rows</Label>
              <Input
                type="number"
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, setRows, rows, 1, Infinity, 1, 50)}
                min={1}
              />
            </div>

            <Button
              onClick={() => {
                if (image) {
                  setCellWidthPx(Math.round(image.width / columns));
                  setCellHeightPx(Math.round(image.height / rows));
                  toast.success("Cell dimensions calculated from grid");
                }
              }}
              disabled={!image}
              variant="outline"
              className="w-full"
            >
              Calculate Cell Dimensions
            </Button>

            <div className="space-y-2">
              <Label>Cell Width (px)</Label>
              <Input
                type="number"
                value={cellWidthPx}
                onChange={(e) => setCellWidthPx(Number(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, setCellWidthPx, cellWidthPx, 0, Infinity, 1, 50)}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Cell Height (px)</Label>
              <Input
                type="number"
                value={cellHeightPx}
                onChange={(e) => setCellHeightPx(Number(e.target.value))}
                onKeyDown={(e) => handleKeyDown(e, setCellHeightPx, cellHeightPx, 0, Infinity, 1, 50)}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Color Method</Label>
              <Select value={colorMethod} onValueChange={(value) => setColorMethod(value as ColorMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="median">Median</SelectItem>
                  <SelectItem value="center">Center Pixel</SelectItem>
                  <SelectItem value="dominant">Dominant Color</SelectItem>
                  <SelectItem value="min">Min Values</SelectItem>
                  <SelectItem value="max">Max Values</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <Button onClick={handleSaveToGallery} className="w-full" disabled={!processedCanvas}>
              <Save className="mr-2 h-4 w-4" />
              Save to Gallery
            </Button>
            <Button onClick={handleExportPNG} className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export as PNG
            </Button>
            <Button onClick={handleExportSVG} className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export as SVG
            </Button>
            <Button onClick={handleCopyPNG} className="w-full" variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Copy as PNG
            </Button>
            <Button onClick={handleCopySVG} className="w-full" variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Copy as SVG
            </Button>
            <Button onClick={handleResetAdjustments} className="w-full" variant="secondary">
              Reset All Settings
            </Button>
          </div>
        </div>
      </div>

      <Canvas image={image} ditheredCanvas={processedCanvas} />
    </div>
  );
}
