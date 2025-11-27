import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Copy, RotateCcw, Save } from "lucide-react";

interface ControlPanelProps {
  ditheringMethod: string;
  onDitheringMethodChange: (value: string) => void;
  foregroundColor: string;
  onForegroundColorChange: (value: string) => void;
  isForegroundTransparent: boolean;
  onForegroundTransparencyChange: (value: boolean) => void;
  backgroundColor: string;
  onBackgroundColorChange: (value: string) => void;
  isBackgroundTransparent: boolean;
  onBackgroundTransparencyChange: (value: boolean) => void;
  brightness: number;
  onBrightnessChange: (value: number) => void;
  contrast: number;
  onContrastChange: (value: number) => void;
  gamma: number;
  onGammaChange: (value: number) => void;
  threshold: number;
  onThresholdChange: (value: number) => void;
  ditherSize: number;
  onDitherSizeChange: (value: number) => void;
  overlayOriginalColors: boolean;
  onOverlayOriginalColorsChange: (value: boolean) => void;
  onSaveToGallery: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onCopyPNG: () => void;
  onCopySVG: () => void;
  onResetAdjustments: () => void;
  hasImage: boolean;
  presetSlot?: ReactNode;
}

export const ControlPanel = ({
  ditheringMethod,
  onDitheringMethodChange,
  foregroundColor,
  onForegroundColorChange,
  isForegroundTransparent,
  onForegroundTransparencyChange,
  backgroundColor,
  onBackgroundColorChange,
  isBackgroundTransparent,
  onBackgroundTransparencyChange,
  brightness,
  onBrightnessChange,
  contrast,
  onContrastChange,
  gamma,
  onGammaChange,
  threshold,
  onThresholdChange,
  ditherSize,
  onDitherSizeChange,
  overlayOriginalColors,
  onOverlayOriginalColorsChange,
  onSaveToGallery,
  onExportPNG,
  onExportSVG,
  onCopyPNG,
  onCopySVG,
  onResetAdjustments,
  hasImage,
  presetSlot,
}: ControlPanelProps) => {
  return (
    <div className="w-80 bg-panel border-r border-border h-full p-6 flex flex-col gap-6 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold mb-2">Dither Tool</h1>
        <p className="text-sm text-muted-foreground">Transform images with dithering effects</p>
      </div>

      {presetSlot}

      <div className="flex flex-col gap-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Image Adjustments</h3>
            <Button
              onClick={onResetAdjustments}
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
              onValueChange={(value) => onBrightnessChange(value[0])}
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
              onValueChange={(value) => onContrastChange(value[0])}
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
              onValueChange={(value) => onGammaChange(value[0])}
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
              onValueChange={(value) => onThresholdChange(value[0])}
            />
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <h3 className="text-sm font-semibold">Dithering Options</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="dither-size" className="text-sm">Dither Size</Label>
              <span className="text-xs text-muted-foreground">{ditherSize}x</span>
            </div>
            <Slider
              id="dither-size"
              min={1}
              max={16}
              step={1}
              value={[ditherSize]}
              onValueChange={(value) => onDitherSizeChange(value[0])}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dithering">Dithering Method</Label>
            <Select value={ditheringMethod} onValueChange={onDitheringMethodChange}>
              <SelectTrigger id="dithering">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="floyd-steinberg">Floyd-Steinberg</SelectItem>
                <SelectItem value="atkinson">Atkinson</SelectItem>
                <SelectItem value="ordered">Ordered (Bayer)</SelectItem>
                <SelectItem value="threshold">Threshold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="overlay-colors"
              checked={overlayOriginalColors}
              onCheckedChange={(checked) => onOverlayOriginalColorsChange(checked === true)}
            />
            <Label htmlFor="overlay-colors" className="text-sm">
              Overlay original colors
            </Label>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <h3 className="text-sm font-semibold">Color Tinting</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="foreground">Foreground Color</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="foreground-transparent"
                  checked={isForegroundTransparent}
                  onCheckedChange={(checked) => onForegroundTransparencyChange(checked === true)}
                />
                <span className="text-xs text-muted-foreground">Transparent</span>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                id="foreground"
                type="color"
                value={foregroundColor}
                onChange={(e) => onForegroundColorChange(e.target.value)}
                disabled={isForegroundTransparent}
                className="w-12 h-10 rounded cursor-pointer border border-border disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <input
                type="text"
                value={foregroundColor}
                onChange={(e) => onForegroundColorChange(e.target.value)}
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
              <Label htmlFor="background">Background Color</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="background-transparent"
                  checked={isBackgroundTransparent}
                  onCheckedChange={(checked) => onBackgroundTransparencyChange(checked === true)}
                />
                <span className="text-xs text-muted-foreground">Transparent</span>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                id="background"
                type="color"
                value={backgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                disabled={isBackgroundTransparent}
                className="w-12 h-10 rounded cursor-pointer border border-border disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => onBackgroundColorChange(e.target.value)}
                disabled={isBackgroundTransparent}
                className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-70"
              />
            </div>
            {isBackgroundTransparent && (
              <p className="text-xs text-muted-foreground">Background color is set to transparent.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <Button onClick={onSaveToGallery} className="w-full" size="lg" disabled={!hasImage}>
          <Save className="mr-2 h-4 w-4" />
          Save to Gallery
        </Button>
        <Button onClick={onExportPNG} className="w-full" size="lg">
          <Download className="mr-2 h-4 w-4" />
          Export PNG
        </Button>
        <Button onClick={onExportSVG} variant="secondary" className="w-full" size="lg">
          <Download className="mr-2 h-4 w-4" />
          Export SVG
        </Button>
        
        <div className="pt-2 border-t border-border" />
        
        <Button onClick={onCopyPNG} variant="outline" className="w-full" size="lg">
          <Copy className="mr-2 h-4 w-4" />
          Copy as PNG
        </Button>
        <Button onClick={onCopySVG} variant="outline" className="w-full" size="lg">
          <Copy className="mr-2 h-4 w-4" />
          Copy as SVG
        </Button>
      </div>
    </div>
  );
};
