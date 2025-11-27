import { useCallback, useEffect, useState } from "react";

export type ToolPreset<T> = {
  id: string;
  name: string;
  data: T;
  createdAt: number;
};

type PresetStorage = Record<string, ToolPreset<unknown>[]>;

const STORAGE_KEY = "pixel-palette-studio-presets";

const readStorage = (): PresetStorage => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PresetStorage;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
};

const writeStorage = (toolId: string, presets: ToolPreset<unknown>[]) => {
  if (typeof window === "undefined") return;
  const storage = readStorage();
  storage[toolId] = presets;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
};

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export const usePresets = <T,>(toolId: string) => {
  const loadPresets = useCallback(() => {
    const storage = readStorage();
    const entries = storage[toolId];
    return Array.isArray(entries) ? (entries as ToolPreset<T>[]) : [];
  }, [toolId]);

  const [presets, setPresets] = useState<ToolPreset<T>[]>(() => {
    const entries = loadPresets();
    return Array.isArray(entries) ? entries : [];
  });

  useEffect(() => {
    setPresets(loadPresets());
  }, [loadPresets]);

  const updatePresets = useCallback(
    (updater: (prev: ToolPreset<T>[]) => ToolPreset<T>[]) => {
      setPresets((prev) => {
        const next = updater(prev);
        writeStorage(toolId, next);
        return next;
      });
    },
    [toolId],
  );

  const savePreset = useCallback(
    (name: string, data: T) => {
      const preset: ToolPreset<T> = {
        id: generateId(),
        name,
        data,
        createdAt: Date.now(),
      };
      updatePresets((prev) => [...prev, preset]);
    },
    [updatePresets],
  );

  const deletePreset = useCallback(
    (id: string) => {
      updatePresets((prev) => prev.filter((preset) => preset.id !== id));
    },
    [updatePresets],
  );

  const renamePreset = useCallback(
    (id: string, name: string) => {
      updatePresets((prev) =>
        prev.map((preset) => (preset.id === id ? { ...preset, name } : preset)),
      );
    },
    [updatePresets],
  );

  return { presets, savePreset, deletePreset, renamePreset };
};
