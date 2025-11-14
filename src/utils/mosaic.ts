export type ColorMethod = 'average' | 'median' | 'center' | 'dominant' | 'min' | 'max';

export interface MosaicSettings {
  columns?: number;
  rows?: number;
  cellWidthPx?: number;
  cellHeightPx?: number;
  colorMethod?: ColorMethod;
}

// Helper function to calculate average color
const calculateAverageColor = (
  data: Uint8ClampedArray,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number
): [number, number, number, number] => {
  let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
  let pixelCount = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const i = (y * width + x) * 4;
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
      totalA += data[i + 3];
      pixelCount++;
    }
  }

  return [
    Math.round(totalR / pixelCount),
    Math.round(totalG / pixelCount),
    Math.round(totalB / pixelCount),
    Math.round(totalA / pixelCount)
  ];
};

// Helper function to calculate median color
const calculateMedianColor = (
  data: Uint8ClampedArray,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number
): [number, number, number, number] => {
  const rValues: number[] = [];
  const gValues: number[] = [];
  const bValues: number[] = [];
  const aValues: number[] = [];

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const i = (y * width + x) * 4;
      rValues.push(data[i]);
      gValues.push(data[i + 1]);
      bValues.push(data[i + 2]);
      aValues.push(data[i + 3]);
    }
  }

  rValues.sort((a, b) => a - b);
  gValues.sort((a, b) => a - b);
  bValues.sort((a, b) => a - b);
  aValues.sort((a, b) => a - b);

  const mid = Math.floor(rValues.length / 2);
  return [rValues[mid], gValues[mid], bValues[mid], aValues[mid]];
};

// Helper function to get center pixel color
const calculateCenterColor = (
  data: Uint8ClampedArray,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number
): [number, number, number, number] => {
  const centerX = Math.floor((startX + endX) / 2);
  const centerY = Math.floor((startY + endY) / 2);
  const i = (centerY * width + centerX) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

// Helper function to calculate dominant color (most frequent)
const calculateDominantColor = (
  data: Uint8ClampedArray,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number
): [number, number, number, number] => {
  const colorMap = new Map<string, { r: number, g: number, b: number, a: number, count: number }>();

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const i = (y * width + x) * 4;
      const r = Math.floor(data[i] / 32) * 32;
      const g = Math.floor(data[i + 1] / 32) * 32;
      const b = Math.floor(data[i + 2] / 32) * 32;
      const key = `${r},${g},${b}`;

      const existing = colorMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorMap.set(key, { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3], count: 1 });
      }
    }
  }

  let maxCount = 0;
  let dominantColor = { r: 0, g: 0, b: 0, a: 255 };

  for (const color of colorMap.values()) {
    if (color.count > maxCount) {
      maxCount = color.count;
      dominantColor = color;
    }
  }

  return [dominantColor.r, dominantColor.g, dominantColor.b, dominantColor.a];
};

// Helper function to calculate minimum color values
const calculateMinColor = (
  data: Uint8ClampedArray,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number
): [number, number, number, number] => {
  let minR = 255, minG = 255, minB = 255, minA = 255;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const i = (y * width + x) * 4;
      minR = Math.min(minR, data[i]);
      minG = Math.min(minG, data[i + 1]);
      minB = Math.min(minB, data[i + 2]);
      minA = Math.min(minA, data[i + 3]);
    }
  }

  return [minR, minG, minB, minA];
};

// Helper function to calculate maximum color values
const calculateMaxColor = (
  data: Uint8ClampedArray,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number
): [number, number, number, number] => {
  let maxR = 0, maxG = 0, maxB = 0, maxA = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const i = (y * width + x) * 4;
      maxR = Math.max(maxR, data[i]);
      maxG = Math.max(maxG, data[i + 1]);
      maxB = Math.max(maxB, data[i + 2]);
      maxA = Math.max(maxA, data[i + 3]);
    }
  }

  return [maxR, maxG, maxB, maxA];
};

// Helper function to get cell color based on method
const getCellColor = (
  data: Uint8ClampedArray,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number,
  method: ColorMethod
): [number, number, number, number] => {
  switch (method) {
    case 'median':
      return calculateMedianColor(data, startX, startY, endX, endY, width);
    case 'center':
      return calculateCenterColor(data, startX, startY, endX, endY, width);
    case 'dominant':
      return calculateDominantColor(data, startX, startY, endX, endY, width);
    case 'min':
      return calculateMinColor(data, startX, startY, endX, endY, width);
    case 'max':
      return calculateMaxColor(data, startX, startY, endX, endY, width);
    case 'average':
    default:
      return calculateAverageColor(data, startX, startY, endX, endY, width);
  }
}

export const applyMosaic = (
  imageData: ImageData,
  settings: MosaicSettings
): ImageData => {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);

  let columns: number;
  let rows: number;
  let cellWidth: number;
  let cellHeight: number;

  // Prioritize cellWidthPx/cellHeightPx if they're greater than 0
  // Otherwise use columns/rows
  if (settings.cellWidthPx && settings.cellWidthPx > 0 && settings.cellHeightPx && settings.cellHeightPx > 0) {
    cellWidth = settings.cellWidthPx;
    cellHeight = settings.cellHeightPx;
    columns = Math.ceil(width / cellWidth);
    rows = Math.ceil(height / cellHeight);
  } else if (settings.columns && settings.columns > 0 && settings.rows && settings.rows > 0) {
    columns = settings.columns;
    rows = settings.rows;
    cellWidth = width / columns;
    cellHeight = height / rows;
  } else {
    // Default fallback
    columns = 20;
    rows = 20;
    cellWidth = width / columns;
    cellHeight = height / rows;
  }

  const colorMethod = settings.colorMethod || 'average';

  // Process each cell
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const startX = Math.floor(col * cellWidth);
      const startY = Math.floor(row * cellHeight);
      const endX = Math.min(Math.floor((col + 1) * cellWidth), width);
      const endY = Math.min(Math.floor((row + 1) * cellHeight), height);

      // Calculate cell color based on selected method
      const [cellR, cellG, cellB, cellA] = getCellColor(
        data,
        startX,
        startY,
        endX,
        endY,
        width,
        colorMethod
      );

      // Fill the entire cell with the calculated color
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const i = (y * width + x) * 4;
          output.data[i] = cellR;
          output.data[i + 1] = cellG;
          output.data[i + 2] = cellB;
          output.data[i + 3] = cellA;
        }
      }
    }
  }

  return output;
};

export const generateMosaicSVG = (
  canvas: HTMLCanvasElement,
  settings: MosaicSettings
): string => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = imageData;

  let columns: number;
  let rows: number;
  let cellWidth: number;
  let cellHeight: number;

  // Prioritize cellWidthPx/cellHeightPx if they're greater than 0
  // Otherwise use columns/rows
  if (settings.cellWidthPx && settings.cellWidthPx > 0 && settings.cellHeightPx && settings.cellHeightPx > 0) {
    cellWidth = settings.cellWidthPx;
    cellHeight = settings.cellHeightPx;
    columns = Math.ceil(width / cellWidth);
    rows = Math.ceil(height / cellHeight);
  } else if (settings.columns && settings.columns > 0 && settings.rows && settings.rows > 0) {
    columns = settings.columns;
    rows = settings.rows;
    cellWidth = width / columns;
    cellHeight = height / rows;
  } else {
    columns = 20;
    rows = 20;
    cellWidth = width / columns;
    cellHeight = height / rows;
  }

  const colorMethod = settings.colorMethod || 'average';
  let rects = "";

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const startX = Math.floor(col * cellWidth);
      const startY = Math.floor(row * cellHeight);
      const endX = Math.min(Math.floor((col + 1) * cellWidth), width);
      const endY = Math.min(Math.floor((row + 1) * cellHeight), height);

      // Calculate cell color based on selected method
      const [cellR, cellG, cellB, cellA] = getCellColor(
        data,
        startX,
        startY,
        endX,
        endY,
        width,
        colorMethod
      );

      const opacity = (cellA / 255).toFixed(2);
      const rectWidth = endX - startX;
      const rectHeight = endY - startY;

      if (parseFloat(opacity) > 0) {
        rects += `<rect x="${startX}" y="${startY}" width="${rectWidth}" height="${rectHeight}" fill="rgb(${cellR},${cellG},${cellB})" opacity="${opacity}" />\n`;
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${rects}
</svg>`;
};
