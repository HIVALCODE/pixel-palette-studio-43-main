export type MapGenerator = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

export interface DisplacementPreset {
  id: string;
  name: string;
  description: string;
  generator: MapGenerator;
}

const drawPixels = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sampler: (x: number, y: number) => number,
) => {
  const imageData = ctx.createImageData(width, height);
  const { data } = imageData;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const value = Math.max(0, Math.min(1, sampler(x, y)));
      const shade = value * 255;
      data[idx] = shade;
      data[idx + 1] = shade;
      data[idx + 2] = shade;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};

const verticalRods: MapGenerator = (ctx, width, height) => {
  const columns = 16;
  drawPixels(ctx, width, height, (x) => {
    const wave = (Math.sin((x / width) * columns * Math.PI) + 1) / 2;
    return wave;
  });
};

const concentricRipples: MapGenerator = (ctx, width, height) => {
  const centerX = width / 2;
  const centerY = height / 2;
  drawPixels(ctx, width, height, (x, y) => {
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return (Math.sin(distance * 0.06) + 1) / 2;
  });
};

const prismWave: MapGenerator = (ctx, width, height) => {
  drawPixels(ctx, width, height, (x, y) => {
    const diagonal = (x + y) / (width + height);
    const wave = (Math.sin((x / width) * 8) + 1) / 2;
    return 0.6 * diagonal + 0.4 * wave;
  });
};

export const displacementPresets: DisplacementPreset[] = [
  {
    id: "vertical",
    name: "Glass Rods",
    description: "Parallel rods for mirrored walls.",
    generator: verticalRods,
  },
  {
    id: "ripples",
    name: "Ripples",
    description: "Circular water-like ripples.",
    generator: concentricRipples,
  },
  {
    id: "prism",
    name: "Prism Waves",
    description: "Diagonal prism distortions.",
    generator: prismWave,
  },
];

export const createPresetCanvas = (presetId: string, size = 256): HTMLCanvasElement => {
  const preset = displacementPresets.find((item) => item.id === presetId) ?? displacementPresets[0];
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    preset.generator(ctx, size, size);
  }
  return canvas;
};

export const generatePresetPreview = (presetId: string, size = 120): string => {
  const canvas = createPresetCanvas(presetId, size);
  return canvas.toDataURL("image/png");
};
