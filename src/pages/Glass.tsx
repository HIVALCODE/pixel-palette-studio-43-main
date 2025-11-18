import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Upload, Download, Copy, RotateCcw, Save } from "lucide-react";
import { Canvas } from "@/components/Canvas";
import { useImage } from "@/contexts/ImageContext";
import { useGallery } from "@/contexts/GalleryContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { displacementPresets, generatePresetPreview, createPresetCanvas } from "@/utils/displacementMaps";
import { applyGlassFilter } from "@/utils/glass";

const defaultPresetId = displacementPresets[0].id;

const Glass = () => {
  const { image } = useImage();
  const { saveImage } = useGallery();
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [distortion, setDistortion] = useState(45);
  const [smoothness, setSmoothness] = useState(4);
  const [scale, setScale] = useState(100);
  const [invert, setInvert] = useState(false);
  const [selectedTexture, setSelectedTexture] = useState<string>(defaultPresetId);
  const [customTexture, setCustomTexture] = useState<HTMLCanvasElement | null>(null);
  const [customTextureName, setCustomTextureName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  const presets = useMemo(
    () =>
      displacementPresets.map((preset) => ({
        ...preset,
        preview: generatePresetPreview(preset.id, 120),
        texture: createPresetCanvas(preset.id, 256),
      })),
    [],
  );

  const activeTexture =
    selectedTexture === "custom"
      ? customTexture ?? null
      : presets.find((preset) => preset.id === selectedTexture)?.texture ?? presets[0]?.texture ?? null;

  useEffect(() => {
    if (!image || !activeTexture) {
      setProcessedCanvas(null);
      return;
    }
    if (processingRef.current) return;
    processingRef.current = true;

    requestAnimationFrame(() => {
      try {
        const canvas = applyGlassFilter(image, {
          distortion,
          smoothness,
          scale: scale / 100,
          invert,
          texture: activeTexture,
        });
        setProcessedCanvas(canvas);
      } catch (error) {
        console.error(error);
        toast({
          title: "Glass filter failed",
          description: error instanceof Error ? error.message : "Unknown processing issue.",
          variant: "destructive",
        });
      } finally {
        processingRef.current = false;
      }
    });
  }, [image, activeTexture, distortion, smoothness, scale, invert]);

  const handleExportPNG = () => {
    if (!processedCanvas) {
      toast({
        title: "No render available",
        description: "Paste an image and tweak parameters first.",
        variant: "destructive",
      });
      return;
    }
    processedCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "glass-filter.png";
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Glass filter exported",
        description: "PNG saved to downloads.",
      });
    });
  };

  const handleCopyPNG = async () => {
    if (!processedCanvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) => processedCanvas.toBlob(resolve));
      if (!blob) throw new Error("Failed to build PNG blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast({
        title: "Copied",
        description: "Glass filter result copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: error instanceof Error ? error.message : "Clipboard access blocked.",
        variant: "destructive",
      });
    }
  };

  const handleSaveToGallery = () => {
    if (!processedCanvas) return;
    const dataUrl = processedCanvas.toDataURL("image/png");
    saveImage(dataUrl, "glass", {
      distortion,
      smoothness,
      scale,
      invert,
      texture: selectedTexture,
      customTextureName,
    });
  };

  const handleUploadTexture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        setCustomTexture(canvas);
        setCustomTextureName(file.name);
        setSelectedTexture("custom");
        toast({
          title: "Texture loaded",
          description: `${file.name} ready for displacement.`,
        });
      };
      img.onerror = () => {
        toast({
          title: "Texture load failed",
          description: "Unsupported or corrupt image.",
          variant: "destructive",
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleResetControls = () => {
    setDistortion(45);
    setSmoothness(4);
    setScale(100);
    setInvert(false);
    setSelectedTexture(defaultPresetId);
    toast({
      title: "Settings reset",
      description: "Glass filter restored to defaults.",
    });
  };

  const currentTextureName =
    selectedTexture === "custom" && customTextureName ? customTextureName : presets.find((p) => p.id === selectedTexture)?.name;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <div className="w-[360px] bg-panel border-r border-border h-full p-6 flex flex-col gap-6 overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Glass Filter</h1>
            <p className="text-xs text-muted-foreground">Photoshop-style refraction powered by displacement textures.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Textures</h2>
            <span className="text-xs text-muted-foreground">{currentTextureName}</span>
          </div>
          <RadioGroup value={selectedTexture} onValueChange={setSelectedTexture} className="space-y-3">
            {presets.map((preset) => (
              <label
                key={preset.id}
                className={`flex items-center gap-3 border rounded-xl p-2 cursor-pointer transition ${
                  selectedTexture === preset.id ? "border-brand bg-brand-soft/50" : "border-border hover:bg-tool-hover"
                }`}
              >
                <RadioGroupItem value={preset.id} />
                <img src={preset.preview} alt={preset.name} className="h-16 w-16 rounded-lg border object-cover" />
                <div>
                  <p className="text-sm font-medium">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </div>
              </label>
            ))}
            <label
              className={`flex items-center gap-3 border rounded-xl p-2 cursor-pointer transition ${
                selectedTexture === "custom" ? "border-brand bg-brand-soft/50" : "border-border hover:bg-tool-hover"
              }`}
            >
              <RadioGroupItem value="custom" />
              <div className="h-16 w-16 rounded-lg border flex items-center justify-center bg-muted text-muted-foreground text-xs">
                {customTexture ? "Custom" : "Upload"}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Custom Texture</p>
                <p className="text-xs text-muted-foreground">{customTextureName || "Upload any grayscale or color map"}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleUploadTexture}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-4 pt-2 border-t border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Filter Controls</h2>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="distortion" className="text-sm">Distortion</Label>
                <span className="text-xs text-muted-foreground">{distortion}px</span>
              </div>
              <Slider id="distortion" min={0} max={120} step={1} value={[distortion]} onValueChange={(value) => setDistortion(value[0])} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="smoothness" className="text-sm">Smoothness</Label>
                <span className="text-xs text-muted-foreground">{smoothness}px blur</span>
              </div>
              <Slider id="smoothness" min={0} max={20} step={0.5} value={[smoothness]} onValueChange={(value) => setSmoothness(value[0])} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="scale" className="text-sm">Texture Scale</Label>
                <span className="text-xs text-muted-foreground">{scale}%</span>
              </div>
              <Slider id="scale" min={25} max={300} step={5} value={[scale]} onValueChange={(value) => setScale(value[0])} />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <Label htmlFor="invert" className="text-sm">Invert Displacement</Label>
                <p className="text-xs text-muted-foreground">Flip the warp direction</p>
              </div>
              <Switch id="invert" checked={invert} onCheckedChange={setInvert} />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-2">
          <Button onClick={handleSaveToGallery} className="w-full" size="lg" disabled={!processedCanvas}>
            <Save className="mr-2 h-4 w-4" />
            Save to Gallery
          </Button>
          <Button onClick={handleExportPNG} className="w-full" size="lg" disabled={!processedCanvas}>
            <Download className="mr-2 h-4 w-4" />
            Export PNG
          </Button>
          <Button variant="outline" onClick={handleCopyPNG} className="w-full" size="lg" disabled={!processedCanvas}>
            <Copy className="mr-2 h-4 w-4" />
            Copy PNG
          </Button>
          <Button variant="ghost" className="w-full" size="sm" onClick={handleResetControls}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Controls
          </Button>
        </div>
      </div>
      <Canvas image={image} ditheredCanvas={processedCanvas} />
    </div>
  );
};

export default Glass;
