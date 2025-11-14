type ColorPalette = "full" | "8bit" | "gameboy" | "4color" | "bw";

const COLOR_PALETTES = {
  gameboy: [
    [15, 56, 15],    // Darkest green
    [48, 98, 48],    // Dark green
    [139, 172, 15],  // Light green
    [155, 188, 15],  // Lightest green
  ],
  "4color": [
    [0, 0, 0],       // Black
    [96, 96, 96],    // Dark gray
    [189, 189, 189], // Light gray
    [255, 255, 255], // White
  ],
};

const quantizeColor = (r: number, g: number, b: number, palette: ColorPalette): [number, number, number] => {
  switch (palette) {
    case "full":
      return [r, g, b];
    
    case "8bit":
      // Reduce to 8-bit color (3-3-2 bits for R-G-B)
      const r8 = Math.round((r / 255) * 7) * 36;
      const g8 = Math.round((g / 255) * 7) * 36;
      const b8 = Math.round((b / 255) * 3) * 85;
      return [r8, g8, b8];
    
    case "gameboy":
    case "4color":
      const colors = COLOR_PALETTES[palette];
      const brightness = (r + g + b) / 3;
      const index = Math.floor((brightness / 255) * (colors.length - 1));
      return colors[index] as [number, number, number];
    
    case "bw":
      const bw = (r + g + b) / 3 > 128 ? 255 : 0;
      return [bw, bw, bw];
    
    default:
      return [r, g, b];
  }
};

export const applyPixelArt = (
  imageData: ImageData,
  pixelSize: number,
  palette: ColorPalette
): ImageData => {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);

  // Process image in pixel blocks
  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      // Calculate average color in this block
      let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
      let pixelCount = 0;

      for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          totalR += data[i];
          totalG += data[i + 1];
          totalB += data[i + 2];
          totalA += data[i + 3];
          pixelCount++;
        }
      }

      const avgR = Math.round(totalR / pixelCount);
      const avgG = Math.round(totalG / pixelCount);
      const avgB = Math.round(totalB / pixelCount);
      const avgA = Math.round(totalA / pixelCount);

      // Apply color palette
      const [finalR, finalG, finalB] = quantizeColor(avgR, avgG, avgB, palette);

      // Fill the entire block with the averaged and quantized color
      for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          output.data[i] = finalR;
          output.data[i + 1] = finalG;
          output.data[i + 2] = finalB;
          output.data[i + 3] = avgA;
        }
      }
    }
  }

  return output;
};

export const generatePixelArtSVG = (
  canvas: HTMLCanvasElement,
  pixelSize: number
): string => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = imageData;
  
  let rects = "";
  const processedColors = new Map<string, string>();

  // Process image in pixel blocks
  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      // Get the color of the first pixel in this block
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3] / 255;

      if (a > 0) {
        const color = `rgb(${r},${g},${b})`;
        const key = `${x},${y},${color}`;
        
        if (!processedColors.has(key)) {
          const blockWidth = Math.min(pixelSize, width - x);
          const blockHeight = Math.min(pixelSize, height - y);
          
          rects += `<rect x="${x}" y="${y}" width="${blockWidth}" height="${blockHeight}" fill="${color}" opacity="${a.toFixed(2)}" />\n`;
          processedColors.set(key, color);
        }
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${rects}
</svg>`;
};
