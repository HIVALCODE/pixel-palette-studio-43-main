import { useState, useEffect, useRef } from "react";
import { Canvas } from "@/components/Canvas";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Copy, RotateCcw, Save } from "lucide-react";
import { applyHalftone, generateHalftoneSVG } from "@/utils/halftone";
import { applyImageAdjustments } from "@/utils/imageAdjustments";
import { useImage } from "@/contexts/ImageContext";
import { useGallery } from "@/contexts/GalleryContext";

const Halftone = () => {
  const { image } = useImage();
  const { saveImage } = useGallery();
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [pattern, setPattern] = useState<"circle" | "square" | "line" | "ellipse">("circle");
  const [dotSize, setDotSize] = useState(4);
  const [angle, setAngle] = useState(45);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [threshold, setThreshold] = useState(128);

  const processingRef = useRef(false);

  useEffect(() => {
    if (!image || processingRef.current) return;

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
      const halftoned = applyHalftone(imageData, dotSize, angle, pattern);

      ctx.putImageData(halftoned, 0, 0);
      setProcessedCanvas(canvas);
      processingRef.current = false;
    }, 0);
  }, [image, pattern, dotSize, angle, brightness, contrast, gamma, threshold]);

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
    if (!processedCanvas) {
      toast({
        title: "Error",
        description: "No image to export",
        variant: "destructive",
      });
      return;
    }

    const svg = generateHalftoneSVG(processedCanvas, dotSize, angle, pattern);
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

  const handleCopySVG = async () => {
    if (!processedCanvas) {
      toast({
        title: "Error",
        description: "No image to copy",
        variant: "destructive",
      });
      return;
    }

    try {
      const svg = generateHalftoneSVG(processedCanvas, dotSize, angle, pattern);
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

  const handleResetAdjustments = () => {
    setBrightness(0);
    setContrast(0);
    setGamma(1);
    setThreshold(128);
    setPattern("circle");
    setDotSize(4);
    setAngle(45);
    toast({
      title: "Reset",
      description: "Settings restored to defaults",
    });
  };

  const handleSaveToGallery = () => {
    if (!processedCanvas) return;
    const dataUrl = processedCanvas.toDataURL('image/png');
    const metadata = { brightness, contrast, gamma, threshold, pattern, dotSize, angle };
    saveImage(dataUrl, 'halftone', metadata);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <div className="w-80 bg-panel border-r border-border h-full p-6 flex flex-col gap-6 overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold mb-2">Halftone Tool</h1>
          <p className="text-sm text-muted-foreground">Create halftone effects from images</p>
        </div>

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
                max={20}
                step={1}
                value={[dotSize]}
                onValueChange={(value) => setDotSize(value[0])}
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
                step={5}
                value={[angle]}
                onValueChange={(value) => setAngle(value[0])}
              />
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
