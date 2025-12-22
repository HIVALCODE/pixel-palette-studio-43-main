// Character sets for different ASCII art styles
const CHARACTER_SETS = {
  standard: " .:-=+*#%@",
  simple: " .oO@",
  detailed:
    " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks: " ░▒▓█",
};

export const generateAsciiArt = (
  imageData: ImageData,
  maxWidth: number = 120,
  charSet: "standard" | "simple" | "detailed" | "blocks" = "standard",
  edgeSharpness: number = 0
): string => {
  const chars = CHARACTER_SETS[charSet];
  const { width, height, data } = imageData;

  // Calculate aspect ratio and dimensions
  const aspectRatio = height / width;
  const asciiWidth = Math.min(width, maxWidth);
  const asciiHeight = Math.floor(asciiWidth * aspectRatio * 0.5); // 0.5 to account for character height

  const cellWidth = width / asciiWidth;
  const cellHeight = height / asciiHeight;

  let ascii = "";

  for (let y = 0; y < asciiHeight; y++) {
    for (let x = 0; x < asciiWidth; x++) {
      // Calculate average brightness for this cell
      let totalBrightness = 0;
      let pixelCount = 0;

      const startX = Math.floor(x * cellWidth);
      const startY = Math.floor(y * cellHeight);
      const endX = Math.floor((x + 1) * cellWidth);
      const endY = Math.floor((y + 1) * cellHeight);

      for (let py = startY; py < endY && py < height; py++) {
        for (let px = startX; px < endX && px < width; px++) {
          const i = (py * width + px) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate brightness (grayscale)
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          totalBrightness += brightness;
          pixelCount++;
        }
      }

      let avgBrightness = totalBrightness / pixelCount;

      // Apply edge sharpness (thresholding)
      if (edgeSharpness > 0) {
        const threshold = 128; // Default threshold
        const distance = avgBrightness - threshold;
        // Adjust the steepness based on edgeSharpness
        // At 1, it's a hard threshold. At 0, it's linear.
        if (edgeSharpness === 1) {
          avgBrightness = avgBrightness >= threshold ? 255 : 0;
        } else {
          // Increase contrast around the threshold
          const factor = 1 / (1 - edgeSharpness * 0.99); // 0.99 to avoid div by 0
          avgBrightness = 128 + distance * factor;
          avgBrightness = Math.max(0, Math.min(255, avgBrightness));
        }
      }

      // Map brightness to character
      const charIndex = Math.floor((avgBrightness / 255) * (chars.length - 1));
      ascii += chars[charIndex];
    }
    ascii += "\n";
  }

  return ascii;
};

export const renderAsciiToPNG = (
  asciiText: string,
  fontSize: number
): HTMLCanvasElement => {
  const lines = asciiText.split("\n").filter((line) => line.length > 0);
  const maxLineLength = Math.max(...lines.map((line) => line.length));

  const charWidth = fontSize * 0.6; // Monospace character width approximation
  const lineHeight = fontSize;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(maxLineLength * charWidth);
  canvas.height = lines.length * lineHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Set background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set text properties
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `${fontSize}px monospace`;
  ctx.textBaseline = "top";

  // Draw each line
  lines.forEach((line, y) => {
    ctx.fillText(line, 0, y * lineHeight);
  });

  return canvas;
};

export const generateAsciiSVG = (
  asciiText: string,
  fontSize: number
): string => {
  const lines = asciiText.split("\n").filter((line) => line.length > 0);
  const maxLineLength = Math.max(...lines.map((line) => line.length));

  const charWidth = fontSize * 0.6;
  const lineHeight = fontSize;
  const width = Math.ceil(maxLineLength * charWidth);
  const height = lines.length * lineHeight;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#000000"/>
  <text font-family="monospace" font-size="${fontSize}" fill="#FFFFFF">`;

  lines.forEach((line, y) => {
    const yPos = (y + 1) * lineHeight - lineHeight * 0.2;
    svg += `\n    <tspan x="0" y="${yPos}">${line
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</tspan>`;
  });

  svg += "\n  </text>\n</svg>";

  return svg;
};
