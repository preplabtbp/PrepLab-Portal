/**
 * Utility functions for OCR-style background removal, ink extraction, 
 * trimming, proportional canvas formatting, and watermark stamping for digital signatures.
 * 
 * Works 100% client-side using HTML5 Canvas with sub-millisecond performance.
 */

export interface WatermarkOptions {
  enabled: boolean;
  text: string;
  subText?: string;
  opacity: number; // 0.05 - 0.50
  color?: string; // hex or rgba
  style: 'diagonal' | 'corner' | 'pattern';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  scale?: number; // 0.4 - 2.5 custom scale
  layer?: 'behind' | 'front';
}

export type SignatureAspectRatio = 'standard' | 'wide' | 'fit';

export interface ProcessSignatureOptions {
  threshold: number; // 50 - 240, default 205 (pixels brighter than this are transparent)
  smoothness: number; // 10 - 60, transition gradient range for anti-aliasing
  colorMode: 'black' | 'dark-blue' | 'original';
  customColor?: string;
  contrast: number; // 1.0 - 2.5
  invert: boolean; // true if signature is light on dark background
  trim: boolean;
  trimPadding: number; // px padding around trimmed bounds (default 24)
  aspectRatio: SignatureAspectRatio; // 'standard' (2:1), 'wide' (2.5:1), or 'fit'
  scale: number; // 0.7 - 1.3 zoom factor for stroke
  watermark?: WatermarkOptions;
}

export const DEFAULT_SIGNATURE_OPTIONS: ProcessSignatureOptions = {
  threshold: 205,
  smoothness: 35,
  colorMode: 'black',
  contrast: 1.3,
  invert: false,
  trim: true,
  trimPadding: 24,
  aspectRatio: 'standard',
  scale: 1.0,
  watermark: {
    enabled: true,
    text: 'HANYA UNTUK PREPLAB PORTAL',
    subText: '',
    opacity: 0.16,
    color: '#000000', // black
    style: 'diagonal',
    size: 'md',
    scale: 1.0,
    layer: 'behind'
  }
};

/**
 * Loads an image from a File, Blob, or Data URL.
 */
export function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat file gambar tanda tangan'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('Gagal membaca file gambar'));
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Automatically estimates the paper background lightness of an image 
 * by sampling the borders.
 */
export function estimateBackgroundLightness(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  try {
    const samples: number[] = [];
    const stepX = Math.max(1, Math.floor(width / 20));
    const stepY = Math.max(1, Math.floor(height / 20));

    // Sample top and bottom borders
    for (let x = 0; x < width; x += stepX) {
      const pTop = ctx.getImageData(x, 2, 1, 1).data;
      const pBot = ctx.getImageData(x, Math.max(0, height - 3), 1, 1).data;
      samples.push(0.299 * pTop[0] + 0.587 * pTop[1] + 0.114 * pTop[2]);
      samples.push(0.299 * pBot[0] + 0.587 * pBot[1] + 0.114 * pBot[2]);
    }

    // Sample left and right borders
    for (let y = 0; y < height; y += stepY) {
      const pLeft = ctx.getImageData(2, y, 1, 1).data;
      const pRight = ctx.getImageData(Math.max(0, width - 3), y, 1, 1).data;
      samples.push(0.299 * pLeft[0] + 0.587 * pLeft[1] + 0.114 * pLeft[2]);
      samples.push(0.299 * pRight[0] + 0.587 * pRight[1] + 0.114 * pRight[2]);
    }

    if (samples.length === 0) return 215;

    // Median of brightest samples
    samples.sort((a, b) => b - a);
    const topSlice = samples.slice(0, Math.max(1, Math.floor(samples.length * 0.7)));
    const avg = topSlice.reduce((sum, v) => sum + v, 0) / topSlice.length;
    return Math.round(avg);
  } catch {
    return 215;
  }
}

/**
 * Applies OCR-style thresholding, background removal, ink coloring,
 * proportional canvas sizing, and optional security watermark.
 */
export async function processSignatureImage(
  source: File | Blob | string,
  userOptions: Partial<ProcessSignatureOptions> = {}
): Promise<{ dataUrl: string; width: number; height: number; estimatedBg: number }> {
  const options: ProcessSignatureOptions = {
    ...DEFAULT_SIGNATURE_OPTIONS,
    ...userOptions,
    watermark: {
      ...DEFAULT_SIGNATURE_OPTIONS.watermark!,
      ...(userOptions.watermark || {})
    }
  };

  const img = await loadImage(source);

  // Maximum dimension for intermediate buffer
  const MAX_DIM = 1400;
  let targetW = img.naturalWidth || img.width || 600;
  let targetH = img.naturalHeight || img.height || 300;

  if (targetW > MAX_DIM || targetH > MAX_DIM) {
    const scale = Math.min(MAX_DIM / targetW, MAX_DIM / targetH);
    targetW = Math.round(targetW * scale);
    targetH = Math.round(targetH * scale);
  }

  // Initial canvas to extract raw pixels
  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = targetW;
  rawCanvas.height = targetH;
  const rawCtx = rawCanvas.getContext('2d');
  if (!rawCtx) throw new Error('Canvas 2D context tidak didukung');

  rawCtx.drawImage(img, 0, 0, targetW, targetH);

  const estimatedBg = estimateBackgroundLightness(rawCtx, targetW, targetH);
  const effectiveThreshold = options.threshold > 0 ? options.threshold : Math.max(120, estimatedBg - 20);

  const imgData = rawCtx.getImageData(0, 0, targetW, targetH);
  const pixels = imgData.data;
  const numPixels = pixels.length;

  // Ink color definition
  let targetR = 0;
  let targetG = 0;
  let targetB = 0;

  if (options.colorMode === 'dark-blue') {
    targetR = 10;
    targetG = 45;
    targetB = 120; // Classic royal ink blue
  } else if (options.colorMode === 'black') {
    targetR = 0;
    targetG = 0;
    targetB = 0;
  }

  const smoothness = Math.max(5, options.smoothness);
  const contrast = Math.max(1.0, options.contrast);

  // Bounding box for auto-trim
  let minX = targetW;
  let minY = targetH;
  let maxX = 0;
  let maxY = 0;
  let hasInk = false;

  for (let i = 0; i < numPixels; i += 4) {
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];
    const originalA = pixels[i + 3];

    if (originalA === 0) {
      continue;
    }

    // Perceived luminance
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (options.invert) {
      lum = 255 - lum;
    }

    if (contrast !== 1.0) {
      lum = 128 + (lum - 128) * contrast;
      lum = Math.min(255, Math.max(0, lum));
    }

    // Background removal
    let alpha = 0;
    if (lum < effectiveThreshold) {
      const diff = effectiveThreshold - lum;
      if (diff >= smoothness) {
        alpha = 255;
      } else {
        const factor = diff / smoothness;
        alpha = Math.round(255 * (factor * (2 - factor)));
      }
    }

    alpha = Math.round((alpha * originalA) / 255);

    if (alpha > 12) {
      const pixelIdx = i / 4;
      const px = pixelIdx % targetW;
      const py = Math.floor(pixelIdx / targetW);

      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
      hasInk = true;
    }

    if (options.colorMode === 'original') {
      pixels[i + 3] = alpha;
    } else {
      pixels[i] = targetR;
      pixels[i + 1] = targetG;
      pixels[i + 2] = targetB;
      pixels[i + 3] = alpha;
    }
  }

  rawCtx.putImageData(imgData, 0, 0);

  // Fallback if no ink detected
  if (!hasInk) {
    return {
      dataUrl: rawCanvas.toDataURL('image/png'),
      width: targetW,
      height: targetH,
      estimatedBg
    };
  }

  // 1. Calculate tight trimmed bounding box
  const rawTrimmedW = Math.max(1, maxX - minX);
  const rawTrimmedH = Math.max(1, maxY - minY);

  // Buffer canvas containing just the trimmed ink
  const inkBuffer = document.createElement('canvas');
  inkBuffer.width = rawTrimmedW;
  inkBuffer.height = rawTrimmedH;
  const inkCtx = inkBuffer.getContext('2d');
  if (!inkCtx) throw new Error('Canvas context tidak didukung');
  inkCtx.drawImage(rawCanvas, minX, minY, rawTrimmedW, rawTrimmedH, 0, 0, rawTrimmedW, rawTrimmedH);

  // 2. Calculate proportional canvas dimensions
  const pad = Math.max(10, options.trimPadding);
  const scale = Math.max(0.6, Math.min(1.4, options.scale || 1.0));
  const scaledInkW = Math.round(rawTrimmedW * scale);
  const scaledInkH = Math.round(rawTrimmedH * scale);

  let finalCanvasW: number;
  let finalCanvasH: number;

  if (options.aspectRatio === 'standard') {
    // 2:1 Proportional Landscape Canvas (Standard Official Document / Contract)
    const requiredW = scaledInkW + pad * 2;
    const requiredH = scaledInkH + pad * 2;

    if (requiredW >= requiredH * 2.0) {
      finalCanvasW = Math.max(400, requiredW);
      finalCanvasH = Math.round(finalCanvasW / 2.0);
    } else {
      finalCanvasH = Math.max(200, requiredH);
      finalCanvasW = Math.round(finalCanvasH * 2.0);
    }
  } else if (options.aspectRatio === 'wide') {
    // 2.5:1 Wide Landscape Canvas (Standard Web Form Signature Box)
    const requiredW = scaledInkW + pad * 2;
    const requiredH = scaledInkH + pad * 2;

    if (requiredW >= requiredH * 2.5) {
      finalCanvasW = Math.max(500, requiredW);
      finalCanvasH = Math.round(finalCanvasW / 2.5);
    } else {
      finalCanvasH = Math.max(200, requiredH);
      finalCanvasW = Math.round(finalCanvasH * 2.5);
    }
  } else {
    // 'fit' - tightly trimmed with balanced padding on all 4 sides
    finalCanvasW = scaledInkW + pad * 2;
    finalCanvasH = scaledInkH + pad * 2;
  }

  // 3. Render final canvas with proper layer order
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = finalCanvasW;
  finalCanvas.height = finalCanvasH;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('Canvas final context tidak didukung');

  // Layer A: Watermark BEHIND signature (Default - keeps ink solid black and vibrant)
  const watermarkOptions = options.watermark;
  if (watermarkOptions?.enabled && watermarkOptions.layer !== 'front') {
    applyWatermarkToCanvas(finalCtx, finalCanvasW, finalCanvasH, watermarkOptions);
  }

  // Layer B: Center the signature ink perfectly with generous breathing room
  const drawX = Math.round((finalCanvasW - scaledInkW) / 2);
  const drawY = Math.round((finalCanvasH - scaledInkH) / 2);

  finalCtx.drawImage(
    inkBuffer, 
    0, 0, rawTrimmedW, rawTrimmedH, 
    drawX, drawY, scaledInkW, scaledInkH
  );

  // Layer C: Watermark ON TOP (if explicitly chosen)
  if (watermarkOptions?.enabled && watermarkOptions.layer === 'front') {
    applyWatermarkToCanvas(finalCtx, finalCanvasW, finalCanvasH, watermarkOptions);
  }

  return {
    dataUrl: finalCanvas.toDataURL('image/png'),
    width: finalCanvasW,
    height: finalCanvasH,
    estimatedBg
  };
}

/**
 * Draws a clean, proportional security watermark on the signature canvas.
 */
function applyWatermarkToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  watermark: WatermarkOptions
) {
  if (!watermark.text || !watermark.enabled) return;

  ctx.save();

  const color = watermark.color || '#000000';
  const opacity = Math.min(0.6, Math.max(0.04, watermark.opacity || 0.16));
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;

  // Calculate size multiplier with distinct, noticeable steps
  let sizeMultiplier = 1.0;
  if (typeof watermark.scale === 'number' && watermark.scale > 0) {
    sizeMultiplier = watermark.scale;
  } else if (watermark.size === 'sm') {
    sizeMultiplier = 0.6;
  } else if (watermark.size === 'md') {
    sizeMultiplier = 1.0;
  } else if (watermark.size === 'lg') {
    sizeMultiplier = 1.6;
  } else if (watermark.size === 'xl') {
    sizeMultiplier = 2.2;
  }

  if (watermark.style === 'diagonal') {
    // Draw diagonal text across center with proportional scaling
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-20 * Math.PI) / 180);

    // Calculate font size relative to diagonal width
    const diagonal = Math.sqrt(width * width + height * height);
    const charCount = Math.max(8, watermark.text.length);
    // Base font size proportionally fits the canvas diagonal without hard-capping at a tiny fixed pixel
    const baseFontSize = (diagonal * 0.85) / charCount;
    // Allow font size to scale smoothly and visibly, bounded only by canvas height proportion
    const fontSize = Math.max(10, Math.min(Math.round(height * 0.45), Math.round(baseFontSize * sizeMultiplier)));

    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const yOffset = watermark.subText ? -fontSize * 0.65 : 0;
    ctx.fillText(watermark.text.toUpperCase(), 0, yOffset);

    if (watermark.subText) {
      const subFontSize = Math.max(9, Math.round(fontSize * 0.58));
      ctx.font = `600 ${subFontSize}px monospace`;
      ctx.fillText(watermark.subText, 0, fontSize * 0.75);
    }
  } else if (watermark.style === 'corner') {
    // Discreet small badge in bottom-right corner
    const baseFontSize = Math.max(12, Math.round(height * 0.08));
    const fontSize = Math.max(9, Math.min(Math.round(height * 0.25), Math.round(baseFontSize * sizeMultiplier)));
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const padding = Math.max(8, Math.round(fontSize * 0.8));
    ctx.fillText(`🔒 ${watermark.text}`, width - padding, height - padding);
  } else if (watermark.style === 'pattern') {
    // Repeating diagonal tile pattern
    ctx.rotate((-20 * Math.PI) / 180);
    const baseFontSize = Math.max(12, Math.round(width / 28));
    const fontSize = Math.max(9, Math.min(Math.round(height * 0.22), Math.round(baseFontSize * sizeMultiplier)));
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;

    // Measure text width dynamically so repeating tiles adapt perfectly to font size
    const textMetrics = ctx.measureText(watermark.text);
    const textWidth = Math.max(100, textMetrics.width);
    const stepX = textWidth + fontSize * 2.5;
    const stepY = fontSize * 3.2;

    for (let x = -width * 1.5; x < width * 2.5; x += stepX) {
      for (let y = -height * 1.5; y < height * 2.5; y += stepY) {
        ctx.fillText(watermark.text, x, y);
      }
    }
  }

  ctx.restore();
}
