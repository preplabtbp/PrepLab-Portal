/**
 * Utility to safely get trimmed signature Data URL from react-signature-canvas.
 * Avoids the Vite/ESM runtime issue with trim-canvas default export:
 * "TypeError: (0, import_trim_canvas.default) is not a function"
 */
export function getSafeSignatureDataUrl(sigCanvasInstance: any): string {
  if (!sigCanvasInstance) return '';

  try {
    if (typeof sigCanvasInstance.isEmpty === 'function' && sigCanvasInstance.isEmpty()) {
      return '';
    }

    const canvas: HTMLCanvasElement | null =
      typeof sigCanvasInstance.getCanvas === 'function'
        ? sigCanvasInstance.getCanvas()
        : sigCanvasInstance.canvas || null;

    if (!canvas) return '';

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return '';

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/png');

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hasDrawn = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          hasDrawn = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!hasDrawn) return '';

    // Add 4px padding around trimmed content
    const padding = 4;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    const trimmedW = maxX - minX;
    const trimmedH = maxY - minY;

    if (trimmedW <= 0 || trimmedH <= 0) return canvas.toDataURL('image/png');

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = trimmedW;
    trimmedCanvas.height = trimmedH;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx) return canvas.toDataURL('image/png');

    trimmedCtx.drawImage(canvas, minX, minY, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);
    return trimmedCanvas.toDataURL('image/png');
  } catch (err) {
    console.warn('[SignatureUtils] Fallback to raw canvas DataURL:', err);
    try {
      if (typeof sigCanvasInstance.getCanvas === 'function') {
        return sigCanvasInstance.getCanvas().toDataURL('image/png');
      }
    } catch {}
  }

  return '';
}
