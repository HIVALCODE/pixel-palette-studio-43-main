export const applyDithering = (
  imageData: ImageData,
  method: string,
  fgColor: string,
  bgColor: string
): ImageData => {
  const width = imageData.width;
  const height = imageData.height;
  const data = new Uint8ClampedArray(imageData.data);
  const output = new ImageData(width, height);

  // Parse colors
  const fg = hexToRgb(fgColor);
  const bg = hexToRgb(bgColor);

  // Convert to grayscale first
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = gray;
  }

  switch (method) {
    case "floyd-steinberg":
      floydSteinberg(data, width, height);
      break;
    case "atkinson":
      atkinson(data, width, height);
      break;
    case "ordered":
      orderedDither(data, width, height);
      break;
    case "threshold":
      threshold(data);
      break;
  }

  // Apply colors
  for (let i = 0; i < data.length; i += 4) {
    const isBlack = data[i] < 128;
    const color = isBlack ? fg : bg;
    output.data[i] = color.r;
    output.data[i + 1] = color.g;
    output.data[i + 2] = color.b;
    output.data[i + 3] = 255;
  }

  return output;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const floydSteinberg = (data: Uint8ClampedArray, width: number, height: number) => {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const oldPixel = data[i];
      const newPixel = oldPixel < 128 ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = newPixel;
      const error = oldPixel - newPixel;

      distributeError(data, width, height, x + 1, y, error * 7 / 16);
      distributeError(data, width, height, x - 1, y + 1, error * 3 / 16);
      distributeError(data, width, height, x, y + 1, error * 5 / 16);
      distributeError(data, width, height, x + 1, y + 1, error * 1 / 16);
    }
  }
};

const atkinson = (data: Uint8ClampedArray, width: number, height: number) => {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const oldPixel = data[i];
      const newPixel = oldPixel < 128 ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = newPixel;
      const error = oldPixel - newPixel;

      distributeError(data, width, height, x + 1, y, error / 8);
      distributeError(data, width, height, x + 2, y, error / 8);
      distributeError(data, width, height, x - 1, y + 1, error / 8);
      distributeError(data, width, height, x, y + 1, error / 8);
      distributeError(data, width, height, x + 1, y + 1, error / 8);
      distributeError(data, width, height, x, y + 2, error / 8);
    }
  }
};

const orderedDither = (data: Uint8ClampedArray, width: number, height: number) => {
  const bayerMatrix = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const threshold = (bayerMatrix[y % 4][x % 4] / 16) * 255;
      const newPixel = data[i] > threshold ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = newPixel;
    }
  }
};

const threshold = (data: Uint8ClampedArray) => {
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] < 128 ? 0 : 255;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
};

const distributeError = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  error: number
) => {
  if (x >= 0 && x < width && y >= 0 && y < height) {
    const i = (y * width + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = Math.max(
      0,
      Math.min(255, data[i] + error)
    );
  }
};

export const generateSVG = (
  canvas: HTMLCanvasElement,
  fgColor: string,
  bgColor: string
): string => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  svg += `<rect width="100%" height="100%" fill="${bgColor}"/>`;

  // Group consecutive pixels in same row for optimization
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Check if pixel is foreground color
      if (Math.abs(r - hexToRgb(fgColor).r) < 10) {
        let rectWidth = 1;
        // Find consecutive foreground pixels
        while (x + rectWidth < width) {
          const nextI = (y * width + (x + rectWidth)) * 4;
          const nextR = data[nextI];
          if (Math.abs(nextR - hexToRgb(fgColor).r) < 10) {
            rectWidth++;
          } else {
            break;
          }
        }
        svg += `<rect x="${x}" y="${y}" width="${rectWidth}" height="1" fill="${fgColor}"/>`;
        x += rectWidth;
      } else {
        x++;
      }
    }
  }

  svg += "</svg>";
  return svg;
};
