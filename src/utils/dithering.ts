export interface DitheringResult {
  imageData: ImageData;
  maskData: Uint8ClampedArray;
}

export const applyDithering = (
  imageData: ImageData,
  method: string,
  fgColor: string,
  bgColor: string,
  ditherSize = 1
): DitheringResult => {
  const originalWidth = imageData.width;
  const originalHeight = imageData.height;

  // Work on a copy so original data remains untouched
  let workingImage = new ImageData(
    new Uint8ClampedArray(imageData.data),
    originalWidth,
    originalHeight
  );

  if (ditherSize > 1) {
    const scaledWidth = Math.max(1, Math.round(originalWidth / ditherSize));
    const scaledHeight = Math.max(1, Math.round(originalHeight / ditherSize));
    workingImage = resizeImageData(workingImage, scaledWidth, scaledHeight);
  }

  const width = workingImage.width;
  const height = workingImage.height;
  const data = new Uint8ClampedArray(workingImage.data);
  const output = new ImageData(width, height);
  let maskData = new Uint8ClampedArray(width * height);

  // Parse colors
  const fg = parseColor(fgColor);
  const bg = parseColor(bgColor);

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
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const isBlack = data[i] < 128;
    const color = isBlack ? fg : bg;
    maskData[p] = data[i];
    output.data[i] = color.r;
    output.data[i + 1] = color.g;
    output.data[i + 2] = color.b;
    output.data[i + 3] = color.a;
  }

  let finalOutput = output;
  if (
    ditherSize > 1 &&
    (output.width !== originalWidth || output.height !== originalHeight)
  ) {
    finalOutput = resizeImageData(output, originalWidth, originalHeight);
    const maskImage = createImageDataFromMask(maskData, output.width, output.height);
    const scaledMask = resizeImageData(maskImage, originalWidth, originalHeight);
    maskData = new Uint8ClampedArray(originalWidth * originalHeight);
    for (let i = 0, p = 0; i < scaledMask.data.length; i += 4, p++) {
      maskData[p] = scaledMask.data[i];
    }
  }

  return { imageData: finalOutput, maskData };
};

const parseColor = (value: string): { r: number; g: number; b: number; a: number } => {
  if (value.trim().toLowerCase() === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255,
      }
    : { r: 0, g: 0, b: 0, a: 255 };
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
  maskData: Uint8ClampedArray,
  width: number,
  height: number,
  fgColor: string,
  bgColor: string
): string => {
  const normalize = (color: string) => color.trim().toLowerCase() === "transparent";
  const isForegroundTransparent = normalize(fgColor);
  const isBackgroundTransparent = normalize(bgColor);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;

  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const index = y * width + x;
      const isForeground = maskData[index] < 128;
      const color = isForeground ? fgColor : bgColor;
      const isTransparent = isForeground ? isForegroundTransparent : isBackgroundTransparent;

      let rectWidth = 1;
      while (x + rectWidth < width) {
        const nextIndex = y * width + (x + rectWidth);
        const nextIsForeground = maskData[nextIndex] < 128;
        if (nextIsForeground === isForeground) {
          rectWidth++;
        } else {
          break;
        }
      }

      if (!isTransparent) {
        svg += `<rect x="${x}" y="${y}" width="${rectWidth}" height="1" fill="${color}"/>`;
      }

      x += rectWidth;
    }
  }

  svg += "</svg>";
  return svg;
};

const resizeImageData = (
  source: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData => {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = source.width;
  sourceCanvas.height = source.height;
  const sourceCtx = sourceCanvas.getContext("2d");

  if (!sourceCtx) {
    return new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  }

  sourceCtx.putImageData(source, 0, 0);

  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = targetWidth;
  targetCanvas.height = targetHeight;
  const targetCtx = targetCanvas.getContext("2d");

  if (!targetCtx) {
    return new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  }

  targetCtx.imageSmoothingEnabled = false;
  targetCtx.drawImage(
    sourceCanvas,
    0,
    0,
    source.width,
    source.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return targetCtx.getImageData(0, 0, targetWidth, targetHeight);
};

const createImageDataFromMask = (maskData: Uint8ClampedArray, width: number, height: number) => {
  const maskImage = new ImageData(width, height);
  for (let i = 0, p = 0; i < maskImage.data.length; i += 4, p++) {
    const value = maskData[p];
    maskImage.data[i] = value;
    maskImage.data[i + 1] = value;
    maskImage.data[i + 2] = value;
    maskImage.data[i + 3] = 255;
  }
  return maskImage;
};
