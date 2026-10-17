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

    // Convert all drawn strokes to pure black (#000000) preserving alpha for smooth anti-aliased edges
    try {
      const finalImgData = trimmedCtx.getImageData(0, 0, trimmedW, trimmedH);
      const pixels = finalImgData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0) {
          pixels[i] = 0;     // Red -> 0
          pixels[i + 1] = 0; // Green -> 0
          pixels[i + 2] = 0; // Blue -> 0
        }
      }
      trimmedCtx.putImageData(finalImgData, 0, 0);
    } catch {}

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

/**
 * Ensures any signature (whether freshly drawn, base64 data URL, or stored image URL)
 * is rendered in 100% pure black (#000000) with transparent background.
 */
export async function ensureSignatureIsBlack(urlOrBase64?: string | null): Promise<string | null> {
  if (!urlOrBase64 || typeof urlOrBase64 !== 'string') return null;
  const trimmed = urlOrBase64.trim();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined') return null;

  return new Promise<string>((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 300;
          const h = img.naturalHeight || img.height || 120;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(trimmed);
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;

          // Recolor all visible pixels to pure black (#000000)
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            if (alpha > 15) {
              data[i] = 0;     // R -> 0
              data[i + 1] = 0; // G -> 0
              data[i + 2] = 0; // B -> 0
            }
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (canvasErr) {
          console.warn('[SignatureUtils] Recolor canvas failed, using original:', canvasErr);
          resolve(trimmed);
        }
      };
      img.onerror = () => resolve(trimmed);
      img.src = trimmed;
    } catch (err) {
      console.warn('[SignatureUtils] ensureSignatureIsBlack exception:', err);
      resolve(trimmed);
    }
  });
}
