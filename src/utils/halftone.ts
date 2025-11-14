export const generateHalftoneSVG = (
  canvas: HTMLCanvasElement,
  dotSize: number,
  angle: number,
  pattern: "circle" | "square" | "line" | "ellipse"
): string => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = imageData;
  
  let shapes = "";
  const angleRad = (angle * Math.PI) / 180;

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
      const maxRadius = dotSize / 2;
      const radius = maxRadius * (1 - avgBrightness / 255);

      if (radius > 0.5) {
        const centerX = x + dotSize / 2;
        const centerY = y + dotSize / 2;

        switch (pattern) {
          case "circle":
            shapes += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="black" transform="rotate(${angle} ${centerX} ${centerY})" />\n`;
            break;

          case "square":
            const size = radius * 1.4;
            shapes += `<rect x="${centerX - size}" y="${centerY - size}" width="${size * 2}" height="${size * 2}" fill="black" transform="rotate(${angle} ${centerX} ${centerY})" />\n`;
            break;

          case "line":
            const lineWidth = radius * 2;
            shapes += `<rect x="${centerX - dotSize / 2}" y="${centerY - lineWidth / 2}" width="${dotSize}" height="${lineWidth}" fill="black" transform="rotate(${angle} ${centerX} ${centerY})" />\n`;
            break;

          case "ellipse":
            const rx = radius * 1.5;
            const ry = radius;
            shapes += `<ellipse cx="${centerX}" cy="${centerY}" rx="${rx}" ry="${ry}" fill="black" transform="rotate(${angle} ${centerX} ${centerY})" />\n`;
            break;
        }
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="white"/>
  ${shapes}
</svg>`;
};

export const applyHalftone = (
  imageData: ImageData,
  dotSize: number,
  angle: number,
  pattern: "circle" | "square" | "line" | "ellipse" = "circle"
): ImageData => {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  
  // Convert angle to radians
  const angleRad = (angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Fill with white background
  for (let i = 0; i < output.data.length; i += 4) {
    output.data[i] = 255;
    output.data[i + 1] = 255;
    output.data[i + 2] = 255;
    output.data[i + 3] = 255;
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
      
      // Convert brightness to dot radius (darker = larger dot)
      const maxRadius = dotSize / 2;
      const radius = maxRadius * (1 - avgBrightness / 255);

      // Draw the halftone pattern
      const centerX = x + dotSize / 2;
      const centerY = y + dotSize / 2;

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
          
          if (shouldDraw) {
            const i = (py * width + px) * 4;
            output.data[i] = 0;
            output.data[i + 1] = 0;
            output.data[i + 2] = 0;
            output.data[i + 3] = 255;
          }
        }
      }
    }
  }

  return output;
};
