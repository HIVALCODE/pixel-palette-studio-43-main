export interface HalftoneCell {
  x: number;
  y: number;
  radius: number;
}

export interface HalftoneResult {
  imageData: ImageData;
  cells: HalftoneCell[];
}

export const generateHalftoneSVG = (
  width: number,
  height: number,
  cells: HalftoneCell[],
  dotSize: number,
  angle: number,
  pattern: "circle" | "square" | "line" | "ellipse",
  fgColor: string,
  bgColor: string
): string => {
  const normalize = (color: string) => color.trim().toLowerCase() === "transparent";
  const isForegroundTransparent = normalize(fgColor);
  const isBackgroundTransparent = normalize(bgColor);

  let shapes = "";

  if (!isForegroundTransparent) {
    for (const cell of cells) {
      if (cell.radius <= 0.5) continue;

      const centerX = cell.x;
      const centerY = cell.y;
      const transform = `rotate(${angle} ${centerX} ${centerY})`;

      switch (pattern) {
        case "circle":
          shapes += `<circle cx="${centerX}" cy="${centerY}" r="${cell.radius}" fill="${fgColor}" transform="${transform}" />\n`;
          break;
        case "square": {
          const size = cell.radius * 1.4;
          shapes += `<rect x="${centerX - size}" y="${centerY - size}" width="${size * 2}" height="${size * 2}" fill="${fgColor}" transform="${transform}" />\n`;
          break;
        }
        case "line": {
          const lineWidth = cell.radius * 2;
          shapes += `<rect x="${centerX - dotSize / 2}" y="${centerY - lineWidth / 2}" width="${dotSize}" height="${lineWidth}" fill="${fgColor}" transform="${transform}" />\n`;
          break;
        }
        case "ellipse": {
          const rx = cell.radius * 1.5;
          const ry = cell.radius;
          shapes += `<ellipse cx="${centerX}" cy="${centerY}" rx="${rx}" ry="${ry}" fill="${fgColor}" transform="${transform}" />\n`;
          break;
        }
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${isBackgroundTransparent ? "" : `<rect width="100%" height="100%" fill="${bgColor}"/>`}
  ${shapes}
</svg>`;
};

export const applyHalftone = (
  imageData: ImageData,
  dotSize: number,
  angle: number,
  pattern: "circle" | "square" | "line" | "ellipse" = "circle",
  fgColor: string = "#000000",
  bgColor: string = "#ffffff",
  invert: boolean = false
): HalftoneResult => {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const cells: HalftoneCell[] = [];
  const fg = parseColor(fgColor);
  const bg = parseColor(bgColor);
  const isForegroundTransparent = fg.a === 0;

  // Convert angle to radians
  const angleRad = (angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Fill with background color
  for (let i = 0; i < output.data.length; i += 4) {
    output.data[i] = bg.r;
    output.data[i + 1] = bg.g;
    output.data[i + 2] = bg.b;
    output.data[i + 3] = bg.a;
  }

  // Process image in grid cells
  for (let y = 0; y < height; y += dotSize) {
    for (let x = 0; x < width; x += dotSize) {
      // Calculate average brightness in this cell
      let totalBrightness = 0;
      let pixelCount = 0;

      for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
          const i = ((y + dy) * width + (x + dx)) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          totalBrightness += brightness;
          pixelCount++;
        }
      }

      const avgBrightness = totalBrightness / pixelCount;
      const normalizedBrightness = Math.max(0, Math.min(1, avgBrightness / 255));
      
      // Convert brightness to dot radius. Invert when requested.
      const maxRadius = dotSize / 2;
      const radius = maxRadius * (invert ? normalizedBrightness : 1 - normalizedBrightness);

      // Draw the halftone pattern
      const centerX = x + dotSize / 2;
      const centerY = y + dotSize / 2;
      if (radius > 0) {
        cells.push({ x: centerX, y: centerY, radius });
      }

      // Apply rotation and draw pattern
      for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
        for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
          const px = x + dx;
          const py = y + dy;

          // Rotate point around cell center
          const relX = dx - dotSize / 2;
          const relY = dy - dotSize / 2;
          const rotX = relX * cos - relY * sin;
          const rotY = relX * sin + relY * cos;

          let shouldDraw = false;

          switch (pattern) {
            case "circle":
              // Check if point is inside the circular dot
              const distance = Math.sqrt(rotX * rotX + rotY * rotY);
              shouldDraw = distance <= radius;
              break;

            case "square":
              // Check if point is inside the square
              const size = radius * 1.4; // Adjust for similar visual weight
              shouldDraw = Math.abs(rotX) <= size && Math.abs(rotY) <= size;
              break;

            case "line":
              // Draw horizontal lines
              shouldDraw = Math.abs(rotY) <= radius;
              break;

            case "ellipse":
              // Check if point is inside the ellipse (stretched horizontally)
              const ellipseX = rotX / 1.5;
              const ellipseY = rotY;
              const ellipseDist = Math.sqrt(ellipseX * ellipseX + ellipseY * ellipseY);
              shouldDraw = ellipseDist <= radius;
              break;
          }
          
          if (shouldDraw && !isForegroundTransparent) {
            const i = (py * width + px) * 4;
            output.data[i] = fg.r;
            output.data[i + 1] = fg.g;
            output.data[i + 2] = fg.b;
            output.data[i + 3] = fg.a;
          }
        }
      }
    }
  }

  return { imageData: output, cells };
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
