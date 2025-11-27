import { useState, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Copy, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { applyImageAdjustments } from "@/utils/imageAdjustments";
import { generateAsciiArt, renderAsciiToPNG, generateAsciiSVG } from "@/utils/ascii";
import { useImage } from "@/contexts/ImageContext";
import { useGallery } from "@/contexts/GalleryContext";
import { ToolPresetManager } from "@/components/ToolPresetManager";

type AsciiPresetState = {
  brightness: number;
  contrast: number;
  gamma: number;
  threshold: number;
  charSet: 'standard' | 'simple' | 'detailed' | 'blocks';
  fontSize: number;
  maxWidth: number;
};

const AsciiArt = () => {
  const { image } = useImage();
  const { saveImage } = useGallery();
  const [asciiText, setAsciiText] = useState<string>("");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [gamma, setGamma] = useState(1);
  const [threshold, setThreshold] = useState(128);
  const [charSet, setCharSet] = useState<'standard' | 'simple' | 'detailed' | 'blocks'>('standard');
  const [fontSize, setFontSize] = useState(8);
  const [maxWidth, setMaxWidth] = useState(120);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const adjusted = applyImageAdjustments(
      imageData,
      brightness,
      contrast,
      gamma,
      threshold
    );
    ctx.putImageData(adjusted, 0, 0);

    const ascii = generateAsciiArt(adjusted, maxWidth, charSet);
    setAsciiText(ascii);
  }, [image, brightness, contrast, gamma, threshold, charSet, maxWidth]);

  const handleResetAdjustments = () => {
    setBrightness(0);
    setContrast(0);
    setGamma(1);
    setThreshold(128);
    setCharSet('standard');
    setFontSize(8);
    setMaxWidth(120);
  };

  const handleSaveToGallery = () => {
    if (!asciiText) return;
    const canvas = renderAsciiToPNG(asciiText, fontSize);
    const dataUrl = canvas.toDataURL('image/png');
    const metadata = { brightness, contrast, gamma, threshold, charSet, fontSize, maxWidth };
    saveImage(dataUrl, 'ascii-art', metadata);
  };

  const asciiPresetState: AsciiPresetState = {
    brightness,
    contrast,
    gamma,
    threshold,
    charSet,
    fontSize,
    maxWidth,
  };

  const handleApplyPresetState = (state: AsciiPresetState) => {
    setBrightness(state.brightness);
    setContrast(state.contrast);
    setGamma(state.gamma);
    setThreshold(state.threshold);
    setCharSet(state.charSet);
    setFontSize(state.fontSize);
    setMaxWidth(state.maxWidth);
  };

  const handleExportPNG = () => {
    if (!asciiText) {
      toast({
        title: "No ASCII art to export",
        description: "Please paste an image first.",
        variant: "destructive",
      });
      return;
    }

    const canvas = renderAsciiToPNG(asciiText, fontSize);
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ascii-art.png";
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Exported successfully",
          description: "ASCII art saved as PNG.",
        });
      }
    });
  };

  const handleExportSVG = () => {
    if (!asciiText) {
      toast({
        title: "No ASCII art to export",
        description: "Please paste an image first.",
        variant: "destructive",
      });
      return;
    }

    const svg = generateAsciiSVG(asciiText, fontSize);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ascii-art.svg";
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported successfully",
      description: "ASCII art saved as SVG.",
    });
  };

  const handleCopyPNG = async () => {
    if (!asciiText) {
      toast({
        title: "No ASCII art to copy",
        description: "Please paste an image first.",
        variant: "destructive",
      });
      return;
    }

    const canvas = renderAsciiToPNG(asciiText, fontSize);
    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          toast({
            title: "Copied to clipboard",
            description: "ASCII art PNG copied successfully.",
          });
        } catch (error) {
          toast({
            title: "Failed to copy",
            description: "Could not copy to clipboard.",
            variant: "destructive",
          });
        }
      }
    });
  };

  const handleCopySVG = async () => {
    if (!asciiText) {
      toast({
        title: "No ASCII art to copy",
        description: "Please paste an image first.",
        variant: "destructive",
      });
      return;
    }

    const svg = generateAsciiSVG(asciiText, fontSize);
    try {
      await navigator.clipboard.writeText(svg);
      toast({
        title: "Copied to clipboard",
        description: "ASCII art SVG copied successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-80 bg-panel border-r border-border overflow-y-auto p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">ASCII Art Converter</h2>
          <p className="text-sm text-muted-foreground">
            Paste an image to convert it into ASCII art
          </p>
        </div>

        <ToolPresetManager<AsciiPresetState>
          toolId="ascii-art"
          currentState={asciiPresetState}
          onApply={handleApplyPresetState}
          disabled={!image}
        />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Image Adjustments</h3>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="brightness">Brightness</Label>
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
            <div className="flex justify-between items-center">
              <Label htmlFor="contrast">Contrast</Label>
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
            <div className="flex justify-between items-center">
              <Label htmlFor="gamma">Gamma</Label>
              <span className="text-xs text-muted-foreground">
                {gamma.toFixed(2)}
              </span>
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
            <div className="flex justify-between items-center">
              <Label htmlFor="threshold">Threshold</Label>
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAdjustments}
            className="w-full"
          >
            Reset Adjustments
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">ASCII Options</h3>

          <div className="space-y-2">
            <Label htmlFor="charSet">Character Set</Label>
            <Select value={charSet} onValueChange={(value: any) => setCharSet(value)}>
              <SelectTrigger id="charSet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="blocks">Blocks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="fontSize">Font Size</Label>
              <span className="text-xs text-muted-foreground">{fontSize}px</span>
            </div>
            <Slider
              id="fontSize"
              min={4}
              max={16}
              step={1}
              value={[fontSize]}
              onValueChange={(value) => setFontSize(value[0])}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="maxWidth">Width (chars)</Label>
              <span className="text-xs text-muted-foreground">{maxWidth}</span>
            </div>
            <Slider
              id="maxWidth"
              min={40}
              max={200}
              step={10}
              value={[maxWidth]}
              onValueChange={(value) => setMaxWidth(value[0])}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold mb-2">Export</h3>
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveToGallery}
            className="w-full"
            disabled={!asciiText}
          >
            <Save className="h-4 w-4 mr-2" />
            Save to Gallery
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPNG}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export as PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportSVG}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export as SVG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPNG}
            className="w-full"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy as PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySVG}
            className="w-full"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy as SVG
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-background overflow-auto p-6">
        <canvas ref={canvasRef} className="hidden" />
        {asciiText ? (
          <pre
            className="font-mono leading-none text-foreground bg-muted p-4 rounded-md overflow-auto whitespace-pre"
            style={{ fontSize: `${fontSize}px`, lineHeight: '1' }}
          >
            {asciiText}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Paste an image to convert to ASCII art
          </div>
        )}
      </div>
    </div>
  );
};

export default AsciiArt;
