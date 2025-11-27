import { useState, useEffect, useRef } from "react";
import { Canvas } from "@/components/Canvas";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Copy, RotateCcw, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { applyHalftone, generateHalftoneSVG, HalftoneCell } from "@/utils/halftone";
import { applyImageAdjustments } from "@/utils/imageAdjustments";
import { useImage } from "@/contexts/ImageContext";
import { useGallery } from "@/contexts/GalleryContext";
import { ToolPresetManager } from "@/components/ToolPresetManager";

type HalftonePresetState = {
  pattern: "circle" | "square" | "line" | "ellipse";
  dotSize: number;
  angle: number;
  foregroundColor: string;
  backgroundColor: string;
  isForegroundTransparent: boolean;
  isBackgroundTransparent: boolean;
  brightness: number;
  contrast: number;
  gamma: number;
  threshold: number;
  invertHalftone: boolean;
};

const Halftone = () => {
  const { image } = useImage();
  const { saveImage } = useGallery();
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [pattern, setPattern] = useState<"circle" | "square" | "line" | "ellipse">("circle");
  const [dotSize, setDotSize] = useState(4);
  const [angle, setAngle] = useState(45);
  const [foregroundColor, setForegroundColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [isForegroundTransparent, setIsForegroundTransparent] = useState(false);
  const [isBackgroundTransparent, setIsBackgroundTransparent] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [threshold, setThreshold] = useState(128);
  const [halftoneCells, setHalftoneCells] = useState<HalftoneCell[] | null>(null);
  const [invertHalftone, setInvertHalftone] = useState(false);

  const processingRef = useRef(false);

  const resolvedForegroundColor = isForegroundTransparent ? "transparent" : foregroundColor;
  const resolvedBackgroundColor = isBackgroundTransparent ? "transparent" : backgroundColor;

  useEffect(() => {
    if (!image) {
      setProcessedCanvas(null);
      setHalftoneCells(null);
      return;
    }

    if (processingRef.current) return;

    processingRef.current = true;

    setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        processingRef.current = false;
        return;
      }

      ctx.drawImage(image, 0, 0);
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Apply adjustments first
      imageData = applyImageAdjustments(
        imageData,
        brightness,
        contrast,
        gamma,
        threshold
      );

      // Then apply halftone
      const { imageData: halftoned, cells } = applyHalftone(
        imageData,
        dotSize,
        angle,
        pattern,
        resolvedForegroundColor,
        resolvedBackgroundColor,
        invertHalftone
      );

      ctx.putImageData(halftoned, 0, 0);
      setProcessedCanvas(canvas);
      setHalftoneCells(cells);
      processingRef.current = false;
    }, 0);
  }, [image, pattern, dotSize, angle, brightness, contrast, gamma, threshold, resolvedForegroundColor, resolvedBackgroundColor, invertHalftone]);

  const handleExportPNG = () => {
    if (!processedCanvas) {
      toast({
        title: "Error",
        description: "No image to export",
        variant: "destructive",
      });
      return;
    }

    processedCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "halftone-image.png";
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "PNG exported successfully",
      });
    });
  };

  const handleExportSVG = () => {
    if (!processedCanvas || !halftoneCells) {
      toast({
        title: "Error",
        description: "No image to export",
        variant: "destructive",
      });
      return;
    }

    const svg = generateHalftoneSVG(
      processedCanvas.width,
      processedCanvas.height,
      halftoneCells,
      dotSize,
      angle,
      pattern,
      resolvedForegroundColor,
      resolvedBackgroundColor
    );
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "halftone-image.svg";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Success",
      description: "SVG exported successfully",
    });
  };

  const handleCopySVG = async () => {
    if (!processedCanvas || !halftoneCells) {
      toast({
        title: "Error",
        description: "No image to copy",
        variant: "destructive",
      });
      return;
    }

    try {
      const svg = generateHalftoneSVG(
        processedCanvas.width,
        processedCanvas.height,
        halftoneCells,
        dotSize,
        angle,
        pattern,
        resolvedForegroundColor,
        resolvedBackgroundColor
      );
      await navigator.clipboard.writeText(svg);
      toast({
        title: "Success",
        description: "SVG copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy SVG to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleCopyPNG = async () => {
    if (!processedCanvas) {
      toast({
        title: "Error",
        description: "No image to copy",
        variant: "destructive",
      });
      return;
    }

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        processedCanvas.toBlob(resolve);
      });

      if (!blob) {
        throw new Error("Failed to create blob");
      }

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      toast({
        title: "Success",
        description: "PNG copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy PNG to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleResetAdjustments = () => {
    setBrightness(0);
    setContrast(0);
    setGamma(1);
    setThreshold(128);
    setPattern("circle");
    setDotSize(4);
    setAngle(45);
    setForegroundColor("#000000");
    setBackgroundColor("#ffffff");
    setIsForegroundTransparent(false);
    setIsBackgroundTransparent(false);
    setInvertHalftone(false);
    setHalftoneCells(null);
    toast({
      title: "Reset",
      description: "Settings restored to defaults",
    });
  };

  const handleSaveToGallery = () => {
    if (!processedCanvas) return;
    const dataUrl = processedCanvas.toDataURL('image/png');
    const metadata = {
      brightness,
      contrast,
      gamma,
      threshold,
      pattern,
      dotSize,
      angle,
      foregroundColor,
      backgroundColor,
      isForegroundTransparent,
      isBackgroundTransparent,
      invertHalftone,
    };
    saveImage(dataUrl, 'halftone', metadata);
  };

  const halftonePresetState: HalftonePresetState = {
    pattern,
    dotSize,
    angle,
    foregroundColor,
    backgroundColor,
    isForegroundTransparent,
    isBackgroundTransparent,
    brightness,
    contrast,
    gamma,
    threshold,
    invertHalftone,
  };

  const handleApplyPresetState = (state: HalftonePresetState) => {
    setPattern(state.pattern);
    setDotSize(state.dotSize);
    setAngle(state.angle);
    setForegroundColor(state.foregroundColor);
    setBackgroundColor(state.backgroundColor);
    setIsForegroundTransparent(state.isForegroundTransparent);
    setIsBackgroundTransparent(state.isBackgroundTransparent);
    setBrightness(state.brightness);
    setContrast(state.contrast);
    setGamma(state.gamma);
    setThreshold(state.threshold);
    setInvertHalftone(state.invertHalftone);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <div className="w-80 bg-panel border-r border-border h-full p-6 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold mb-2">Halftone Tool</h1>
          <p className="text-sm text-muted-foreground">Create halftone effects from images</p>
        </div>

        <ToolPresetManager<HalftonePresetState>
          toolId="halftone"
          currentState={halftonePresetState}
          onApply={handleApplyPresetState}
          disabled={!image}
        />

        <div className="flex flex-col gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Image Adjustments</h3>
              <Button
                onClick={handleResetAdjustments}
                variant="ghost"
                size="sm"
                className="h-8 px-2"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="brightness" className="text-sm">Brightness</Label>
                <span className="text-xs text-muted-foreground">{brightness}</span>
              </div>
              <Slider
                id="brightness"
                min={-100}
                max={100}
                step={1}
                value={[brightness]}
                onValueChange={(value) => setBrightness(value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="contrast" className="text-sm">Contrast</Label>
                <span className="text-xs text-muted-foreground">{contrast}</span>
              </div>
              <Slider
                id="contrast"
                min={-100}
                max={100}
                step={1}
                value={[contrast]}
                onValueChange={(value) => setContrast(value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="gamma" className="text-sm">Gamma</Label>
                <span className="text-xs text-muted-foreground">{gamma.toFixed(2)}</span>
              </div>
              <Slider
                id="gamma"
                min={0.1}
                max={3}
                step={0.1}
                value={[gamma]}
                onValueChange={(value) => setGamma(value[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="threshold" className="text-sm">Threshold</Label>
                <span className="text-xs text-muted-foreground">{threshold}</span>
              </div>
              <Slider
                id="threshold"
                min={0}
                max={255}
                step={1}
                value={[threshold]}
                onValueChange={(value) => setThreshold(value[0])}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-semibold mb-4">Halftone Options</h3>
            
            <div className="space-y-2 mb-4">
              <Label htmlFor="pattern" className="text-sm">Pattern</Label>
              <Select value={pattern} onValueChange={(value: any) => setPattern(value)}>
                <SelectTrigger id="pattern" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="circle">Circle</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="ellipse">Ellipse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="dotSize" className="text-sm">Dot Size</Label>
                <span className="text-xs text-muted-foreground">{dotSize}px</span>
              </div>
              <Slider
                id="dotSize"
                min={2}
                max={100}
                step={1}
                value={[dotSize]}
                onValueChange={(value) => setDotSize(value[0])}
              />
              <Input
                id="dotSize-input"
                type="number"
                min={2}
                max={100}
                step={1}
                value={dotSize}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isNaN(value)) return;
                  setDotSize(Math.min(100, Math.max(2, value)));
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="angle" className="text-sm">Angle</Label>
                <span className="text-xs text-muted-foreground">{angle}°</span>
              </div>
              <Slider
                id="angle"
                min={0}
                max={90}
                step={1}
                value={[angle]}
                onValueChange={(value) => setAngle(value[0])}
              />
              <Input
                id="angle-input"
                type="number"
                min={0}
                max={90}
                step={1}
                value={angle}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isNaN(value)) return;
                  setAngle(Math.min(90, Math.max(0, value)));
                }}
              />
            </div>

            <div className="flex items-start justify-between gap-4 pt-2">
              <div>
                <Label htmlFor="invert-halftone" className="text-sm">Invert Halftone</Label>
                <p className="text-xs text-muted-foreground">Reverse dot density instead of just swapping colors.</p>
              </div>
              <Checkbox
                id="invert-halftone"
                checked={invertHalftone}
                onCheckedChange={(checked) => setInvertHalftone(checked === true)}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-4">
            <h3 className="text-sm font-semibold">Color Options</h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="halftone-foreground">Foreground Color</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="halftone-foreground-transparent"
                    checked={isForegroundTransparent}
                    onCheckedChange={(checked) => setIsForegroundTransparent(checked === true)}
                  />
                  <span className="text-xs text-muted-foreground">Transparent</span>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  id="halftone-foreground"
                  type="color"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  disabled={isForegroundTransparent}
                  className="w-12 h-10 rounded cursor-pointer border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <input
                  type="text"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  disabled={isForegroundTransparent}
                  className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-70"
                />
              </div>
              {isForegroundTransparent && (
                <p className="text-xs text-muted-foreground">Foreground color is set to transparent.</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="halftone-background">Background Color</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="halftone-background-transparent"
                    checked={isBackgroundTransparent}
                    onCheckedChange={(checked) => setIsBackgroundTransparent(checked === true)}
                  />
                  <span className="text-xs text-muted-foreground">Transparent</span>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  id="halftone-background"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={isBackgroundTransparent}
                  className="w-12 h-10 rounded cursor-pointer border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={isBackgroundTransparent}
                  className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-70"
                />
              </div>
              {isBackgroundTransparent && (
                <p className="text-xs text-muted-foreground">Background color is set to transparent.</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            <Button onClick={handleSaveToGallery} className="w-full" size="lg" disabled={!processedCanvas}>
              <Save className="mr-2 h-4 w-4" />
              Save to Gallery
            </Button>
            <Button onClick={handleExportPNG} className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Export as PNG
            </Button>
            <Button onClick={handleExportSVG} variant="outline" className="w-full" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Export as SVG
            </Button>
            
            <div className="pt-2 border-t border-border" />
            
            <Button onClick={handleCopyPNG} variant="outline" className="w-full" size="lg">
              <Copy className="mr-2 h-4 w-4" />
              Copy as PNG
            </Button>
            <Button onClick={handleCopySVG} variant="outline" className="w-full" size="lg">
              <Copy className="mr-2 h-4 w-4" />
              Copy as SVG
            </Button>
          </div>
        </div>
      </div>
      <Canvas image={image} ditheredCanvas={processedCanvas} />
    </div>
  );
};

export default Halftone;
