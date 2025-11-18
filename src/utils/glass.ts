export interface GlassFilterSettings {
  distortion: number;
  smoothness: number;
  scale: number;
  invert: boolean;
  texture: HTMLCanvasElement;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const toCanvas = (source: HTMLCanvasElement | HTMLImageElement): HTMLCanvasElement => {
  if (source instanceof HTMLCanvasElement) return source;
  const canvas = document.createElement("canvas");
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(source, 0, 0, width, height);
  return canvas;
};

const createScaledTexture = (source: HTMLCanvasElement, scale: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  const factor = Math.max(0.05, scale);
  canvas.width = Math.max(1, Math.round(source.width * factor));
  canvas.height = Math.max(1, Math.round(source.height * factor));
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
};

const buildDisplacementMap = (
  texture: HTMLCanvasElement,
  width: number,
  height: number,
  scale: number,
  smoothness: number,
): ImageData => {
  const baseTexture = toCanvas(texture);
  const scaled = createScaledTexture(baseTexture, scale);
  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = width;
  tileCanvas.height = height;
  const tileCtx = tileCanvas.getContext("2d");
  if (!tileCtx) throw new Error("Unable to create displacement canvas");

  const pattern = tileCtx.createPattern(scaled, "repeat");
  if (pattern) {
    tileCtx.fillStyle = pattern;
    tileCtx.fillRect(0, 0, width, height);
  } else {
    for (let y = 0; y < height; y += scaled.height) {
      for (let x = 0; x < width; x += scaled.width) {
        tileCtx.drawImage(scaled, x, y);
      }
    }
  }

  const imageData = tileCtx.getImageData(0, 0, width, height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  tileCtx.putImageData(imageData, 0, 0);

  if (smoothness <= 0) {
    return imageData;
  }

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurCtx = blurCanvas.getContext("2d");
  if (!blurCtx) return imageData;
  blurCtx.filter = `blur(${smoothness}px)`;
  blurCtx.drawImage(tileCanvas, 0, 0);
  return blurCtx.getImageData(0, 0, width, height);
};

const sampleBilinear = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number, number] => {
  const clampedX = clamp(x, 0, width - 1);
  const clampedY = clamp(y, 0, height - 1);
  const x0 = Math.floor(clampedX);
  const x1 = Math.min(width - 1, x0 + 1);
  const y0 = Math.floor(clampedY);
  const y1 = Math.min(height - 1, y0 + 1);
  const xf = clampedX - x0;
  const yf = clampedY - y0;

  const idx = (xx: number, yy: number) => (yy * width + xx) * 4;
  const topLeft = idx(x0, y0);
  const topRight = idx(x1, y0);
  const bottomLeft = idx(x0, y1);
  const bottomRight = idx(x1, y1);

  const interpolate = (a: number, b: number, t: number) => a + (b - a) * t;

  const top: number[] = [];
  const bottom: number[] = [];
  for (let channel = 0; channel < 4; channel += 1) {
    top[channel] = interpolate(data[topLeft + channel], data[topRight + channel], xf);
    bottom[channel] = interpolate(data[bottomLeft + channel], data[bottomRight + channel], xf);
  }

  return bottom.map((value, channel) => interpolate(top[channel], value, yf)) as [number, number, number, number];
};

export const applyGlassFilter = (image: HTMLImageElement, settings: GlassFilterSettings): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to acquire canvas context");

  ctx.drawImage(image, 0, 0);
  const baseData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mapData = buildDisplacementMap(settings.texture, canvas.width, canvas.height, settings.scale, settings.smoothness);
  const output = ctx.createImageData(canvas.width, canvas.height);

  const direction = settings.invert ? -1 : 1;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const idx = (y * canvas.width + x) * 4;
      const mapValue = mapData.data[idx] / 255;
      const offset = (mapValue - 0.5) * settings.distortion * direction;
      const sample = sampleBilinear(baseData.data, canvas.width, canvas.height, x + offset, y + offset);
      output.data[idx] = sample[0];
      output.data[idx + 1] = sample[1];
      output.data[idx + 2] = sample[2];
      output.data[idx + 3] = sample[3];
    }
  }

  ctx.putImageData(output, 0, 0);
  return canvas;
};
