import { useState, useEffect, useRef } from "react";
import { ControlPanel } from "@/components/ControlPanel";
import { Canvas } from "@/components/Canvas";
import { applyDithering, generateSVG } from "@/utils/dithering";
import { applyImageAdjustments } from "@/utils/imageAdjustments";
import { toast } from "@/hooks/use-toast";
import { useImage } from "@/contexts/ImageContext";
import { useGallery } from "@/contexts/GalleryContext";

const Index = () => {
  const { image } = useImage();
  const { saveImage } = useGallery();
  const [ditheredCanvas, setDitheredCanvas] = useState<HTMLCanvasElement | null>(null);
  const [ditheringMethod, setDitheringMethod] = useState("floyd-steinberg");
  const [foregroundColor, setForegroundColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [threshold, setThreshold] = useState(128);

  const processingRef = useRef(false);

  useEffect(() => {
    if (!image || processingRef.current) return;

    processingRef.current = true;

    // Process in next tick to allow UI to update
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

      // Then apply dithering
      const dithered = applyDithering(
        imageData,
        ditheringMethod,
        foregroundColor,
        backgroundColor
      );

      ctx.putImageData(dithered, 0, 0);
      setDitheredCanvas(canvas);
      processingRef.current = false;
    }, 0);
  }, [image, ditheringMethod, foregroundColor, backgroundColor, brightness, contrast, gamma, threshold]);

  const handleExportPNG = () => {
    if (!ditheredCanvas) {
      toast({
        title: "Error",
        description: "No image to export",
        variant: "destructive",
      });
      return;
    }

    ditheredCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dithered-image.png";
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "PNG exported successfully",
      });
    });
  };

  const handleExportSVG = () => {
    if (!ditheredCanvas) {
      toast({
        title: "Error",
        description: "No image to export",
        variant: "destructive",
      });
      return;
    }

    const svg = generateSVG(ditheredCanvas, foregroundColor, backgroundColor);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dithered-image.svg";
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Success",
      description: "SVG exported successfully",
    });
  };

  const handleCopyPNG = async () => {
    if (!ditheredCanvas) {
      toast({
        title: "Error",
        description: "No image to copy",
        variant: "destructive",
      });
      return;
    }

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        ditheredCanvas.toBlob(resolve);
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
    if (!ditheredCanvas) {
      toast({
        title: "Error",
        description: "No image to copy",
        variant: "destructive",
      });
      return;
    }

    try {
      const svg = generateSVG(ditheredCanvas, foregroundColor, backgroundColor);
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
    toast({
      title: "Reset",
      description: "Image adjustments restored to defaults",
    });
  };

  const handleSaveToGallery = () => {
    if (!ditheredCanvas) return;
    const dataUrl = ditheredCanvas.toDataURL('image/png');
    const metadata = {
      ditheringMethod,
      foregroundColor,
      backgroundColor,
      brightness,
      contrast,
      gamma,
      threshold,
    };
    saveImage(dataUrl, 'dither', metadata);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <ControlPanel
        ditheringMethod={ditheringMethod}
        onDitheringMethodChange={setDitheringMethod}
        foregroundColor={foregroundColor}
        onForegroundColorChange={setForegroundColor}
        backgroundColor={backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        contrast={contrast}
        onContrastChange={setContrast}
        gamma={gamma}
        onGammaChange={setGamma}
        threshold={threshold}
        onThresholdChange={setThreshold}
        onSaveToGallery={handleSaveToGallery}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onCopyPNG={handleCopyPNG}
        onCopySVG={handleCopySVG}
        onResetAdjustments={handleResetAdjustments}
        hasImage={!!ditheredCanvas}
      />
      <Canvas image={image} ditheredCanvas={ditheredCanvas} />
    </div>
  );
};

export default Index;
