// Dynamic text contrast: luminance & rasio kontras WCAG 2.x untuk memilih/menyesuaikan warna teks
// berdasarkan kecerahan background di belakangnya.

export interface RGBA { r: number; g: number; b: number; a: number }

export const DARK_TEXT: RGBA = { r: 15, g: 23, b: 42, a: 1 }; // slate-900
export const LIGHT_TEXT: RGBA = { r: 248, g: 250, b: 252, a: 1 }; // slate-50

// Rasio minimum WCAG AA: 4.5 teks normal, 3 teks besar / tebal
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

let parseCtx: CanvasRenderingContext2D | null = null;

export function parseColor(input: string | null | undefined): RGBA | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (!s || s === 'none' || s === 'currentcolor' || s === 'inherit') return null;
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    const alpha = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a: alpha };
  }
  // Format lain (oklch, hsl, nama warna): biarkan browser menormalkan lewat canvas
  if (typeof document === 'undefined') return null;
  try {
    parseCtx = parseCtx || document.createElement('canvas').getContext('2d');
    if (!parseCtx) return null;
    parseCtx.fillStyle = '#010203';
    parseCtx.fillStyle = s;
    const normalized = String(parseCtx.fillStyle);
    if (normalized === '#010203' && s !== '#010203') return null;
    return normalized.startsWith('#') || normalized.startsWith('rgb') ? parseColor(normalized) : null;
  } catch {
    return null;
  }
}

export function toCss(c: RGBA): string {
  const r = Math.round(c.r), g = Math.round(c.g), b = Math.round(c.b);
  return c.a >= 1 ? `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}` : `rgba(${r}, ${g}, ${b}, ${+c.a.toFixed(3)})`;
}

// Warna `top` (dengan alpha) ditumpuk di atas `bottom` yang opak
export function composite(top: RGBA, bottom: RGBA): RGBA {
  const a = top.a;
  return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
}

export function luminance(c: RGBA): number {
  const ch = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

export function contrastRatio(a: RGBA, b: RGBA): number {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function isDarkColor(bg: RGBA): boolean {
  return contrastRatio(LIGHT_TEXT, bg) > contrastRatio(DARK_TEXT, bg);
}

// Teks terang untuk background gelap, teks gelap untuk background terang
export function readableTextOn(bg: RGBA): RGBA {
  return isDarkColor(bg) ? LIGHT_TEXT : DARK_TEXT;
}

function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, a: 1 };
}

// Pertahankan warna teks (mis. warna brand) bila masih terbaca; bila tidak, geser bertahap ke arah
// hitam/putih sampai rasio kontras tercapai. Background boleh lebih dari satu (mis. kartu & halaman).
export function ensureContrast(fg: RGBA, bgs: RGBA | RGBA[], min = AA_NORMAL): RGBA {
  const list = Array.isArray(bgs) ? bgs : [bgs];
  const worst = (c: RGBA) => Math.min(...list.map(bg => contrastRatio(c, bg)));
  const solid = { ...fg, a: 1 };
  if (worst(solid) >= min) return solid;
  const avgLum = list.reduce((s, bg) => s + luminance(bg), 0) / list.length;
  const target = avgLum > 0.18 ? DARK_TEXT : LIGHT_TEXT;
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    const c = mix(solid, target, t);
    if (worst(c) >= min) return c;
  }
  // Background campuran terang & gelap: pilih ekstrem dengan kontras terburuk paling tinggi
  return worst(DARK_TEXT) >= worst(LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT;
}

// Koreksi variabel tema: teks utama/muted/header selalu terbaca di atas background tema
export function withReadableThemeColors(colors: Record<string, string>): Record<string, string> {
  const get = (k: string) => parseColor(colors[k]);
  const out = { ...colors };
  const card = get('--card-bg'), page = get('--bg-main'), input = get('--input-bg'), header = get('--header-bg');
  const surfaces = [card, page, input].filter((c): c is RGBA => !!c && c.a > 0).map(c => (c.a < 1 ? composite(c, { r: 255, g: 255, b: 255, a: 1 }) : c));
  const fix = (key: string, bgs: RGBA[], min: number, fallback: RGBA) => {
    if (!bgs.length) return;
    const fg = get(key) || fallback;
    out[key] = toCss(ensureContrast(fg, bgs, min));
  };
  if (surfaces.length) {
    fix('--text-main', surfaces, 7, readableTextOn(surfaces[0]));
    fix('--text-muted', surfaces, AA_NORMAL, readableTextOn(surfaces[0]));
  }
  if (header) {
    fix('--header-text', [header], AA_NORMAL, readableTextOn(header));
    fix('--username-color', [header], AA_NORMAL, readableTextOn(header));
  }
  const primary = get('--primary'), accent = get('--accent');
  if (primary) out['--on-primary'] = toCss(readableTextOn(primary));
  if (accent) out['--on-accent'] = toCss(readableTextOn(accent));
  if (card) out['--theme-scheme'] = isDarkColor(card) ? 'dark' : 'light';
  return out;
}
