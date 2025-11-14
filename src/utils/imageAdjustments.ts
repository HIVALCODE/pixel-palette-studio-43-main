export const applyImageAdjustments = (
  imageData: ImageData,
  brightness: number,
  contrast: number,
  gamma: number,
  threshold: number
): ImageData => {
  const data = new Uint8ClampedArray(imageData.data);
  const adjusted = new ImageData(imageData.width, imageData.height);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Apply brightness
    r += brightness;
    g += brightness;
    b += brightness;

    // Apply contrast
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // Apply gamma
    r = 255 * Math.pow(r / 255, 1 / gamma);
    g = 255 * Math.pow(g / 255, 1 / gamma);
    b = 255 * Math.pow(b / 255, 1 / gamma);

    // Clamp values
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    // Apply threshold adjustment (shift the threshold point)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const thresholdAdjust = (gray - threshold) * 2 + threshold;
    const finalGray = Math.max(0, Math.min(255, thresholdAdjust));
    
    // Map back to RGB maintaining the adjustment
    const ratio = gray > 0 ? finalGray / gray : 1;
    r *= ratio;
    g *= ratio;
    b *= ratio;

    adjusted.data[i] = Math.max(0, Math.min(255, r));
    adjusted.data[i + 1] = Math.max(0, Math.min(255, g));
    adjusted.data[i + 2] = Math.max(0, Math.min(255, b));
    adjusted.data[i + 3] = data[i + 3]; // Keep alpha
  }

  return adjusted;
};
