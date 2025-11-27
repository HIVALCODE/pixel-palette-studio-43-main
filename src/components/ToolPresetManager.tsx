import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePresets } from "@/hooks/usePresets";
import { toast } from "@/hooks/use-toast";

type ToolPresetManagerProps<T extends Record<string, unknown>> = {
  toolId: string;
  currentState: T;
  onApply: (state: T) => void;
  title?: string;
  description?: string;
  disabled?: boolean;
};

export const ToolPresetManager = <T extends Record<string, unknown>>({
  toolId,
  currentState,
  onApply,
  title = "Custom Presets",
  description = "Save your favorite configurations for quick reuse.",
  disabled = false,
}: ToolPresetManagerProps<T>) => {
  const { presets, savePreset, deletePreset } = usePresets<T>(toolId);
  const [presetName, setPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");

  const handleSave = () => {
    if (disabled) return;
    const name = presetName.trim();
    if (!name) {
      toast({
        title: "Preset needs a name",
        description: "Give your preset a short label before saving.",
        variant: "destructive",
      });
      return;
    }
    savePreset(name, currentState);
    setPresetName("");
    toast({
      title: "Preset saved",
      description: `"${name}" is now available to reuse.`,
    });
  };

  const handleApply = () => {
    if (!selectedPresetId) return;
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) return;
    onApply(preset.data);
    toast({
      title: "Preset applied",
      description: `"${preset.name}" settings restored.`,
    });
  };

  const handleDelete = () => {
    if (!selectedPresetId) return;
    const preset = presets.find((item) => item.id === selectedPresetId);
    deletePreset(selectedPresetId);
    setSelectedPresetId("");
    toast({
      title: "Preset removed",
      description: preset ? `"${preset.name}" was deleted.` : "Preset deleted.",
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-tool/80 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${toolId}-preset-name`} className="text-xs">
          Preset name
        </Label>
        <div className="flex gap-2">
          <Input
            id={`${toolId}-preset-name`}
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="e.g. Bold shadows"
            disabled={disabled}
          />
          <Button onClick={handleSave} disabled={disabled}>
            Save
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Saved presets</Label>
        <Select value={selectedPresetId} onValueChange={setSelectedPresetId} disabled={!presets.length}>
          <SelectTrigger>
            <SelectValue placeholder={presets.length ? "Choose a preset" : "No presets yet"} />
          </SelectTrigger>
          <SelectContent>
            {presets.length
              ? [...presets]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))
              : (
                <SelectItem value="__empty" disabled>
                  Save a preset to get started
                </SelectItem>
              )}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={!selectedPresetId}
            onClick={handleApply}
          >
            Apply
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={!selectedPresetId}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
