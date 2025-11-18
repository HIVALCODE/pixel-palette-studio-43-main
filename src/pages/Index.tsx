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
  const [isForegroundTransparent, setIsForegroundTransparent] = useState(false);
  const [isBackgroundTransparent, setIsBackgroundTransparent] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [threshold, setThreshold] = useState(128);
  const [ditherSize, setDitherSize] = useState(1);
  const [overlayOriginalColors, setOverlayOriginalColors] = useState(false);
  const [ditherMask, setDitherMask] = useState<Uint8ClampedArray | null>(null);

  const processingRef = useRef(false);

  const resolvedForegroundColor = isForegroundTransparent ? "transparent" : foregroundColor;
  const resolvedBackgroundColor = isBackgroundTransparent ? "transparent" : backgroundColor;

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
      const { imageData: dithered, maskData } = applyDithering(
        imageData,
        ditheringMethod,
        resolvedForegroundColor,
        resolvedBackgroundColor,
        ditherSize
      );

      ctx.putImageData(dithered, 0, 0);

      if (overlayOriginalColors) {
        const overlayCanvas = document.createElement("canvas");
        overlayCanvas.width = canvas.width;
        overlayCanvas.height = canvas.height;
        const overlayCtx = overlayCanvas.getContext("2d");
        if (overlayCtx) {
          overlayCtx.putImageData(imageData, 0, 0);
          ctx.save();
          ctx.globalCompositeOperation = "color";
          ctx.drawImage(overlayCanvas, 0, 0);
          ctx.restore();
        }
      }
      setDitheredCanvas(canvas);
      setDitherMask(maskData);
      processingRef.current = false;
    }, 0);
  }, [image, ditheringMethod, resolvedForegroundColor, resolvedBackgroundColor, brightness, contrast, gamma, threshold, ditherSize, overlayOriginalColors]);

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
    if (!ditheredCanvas || !ditherMask) {
      toast({
        title: "Error",
        description: "No image to export",
        variant: "destructive",
      });
      return;
    }

    const svg = generateSVG(
      ditherMask,
      ditheredCanvas.width,
      ditheredCanvas.height,
      resolvedForegroundColor,
      resolvedBackgroundColor
    );
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
    if (!ditheredCanvas || !ditherMask) {
      toast({
        title: "Error",
        description: "No image to copy",
        variant: "destructive",
      });
      return;
    }

    try {
      const svg = generateSVG(
        ditherMask,
        ditheredCanvas.width,
        ditheredCanvas.height,
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

  const handleResetAdjustments = () => {
    setBrightness(0);
    setContrast(0);
    setGamma(1);
    setThreshold(128);
    setDitherSize(1);
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
      isForegroundTransparent,
      isBackgroundTransparent,
      brightness,
      contrast,
      gamma,
      threshold,
      ditherSize,
      overlayOriginalColors,
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
        isForegroundTransparent={isForegroundTransparent}
        onForegroundTransparencyChange={setIsForegroundTransparent}
        backgroundColor={backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
        isBackgroundTransparent={isBackgroundTransparent}
        onBackgroundTransparencyChange={setIsBackgroundTransparent}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        contrast={contrast}
        onContrastChange={setContrast}
        gamma={gamma}
        onGammaChange={setGamma}
        threshold={threshold}
        onThresholdChange={setThreshold}
        ditherSize={ditherSize}
        onDitherSizeChange={setDitherSize}
        overlayOriginalColors={overlayOriginalColors}
        onOverlayOriginalColorsChange={setOverlayOriginalColors}
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
