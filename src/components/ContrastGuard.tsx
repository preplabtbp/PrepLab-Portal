import { useEffect } from 'react';
import { RGBA, parseColor, composite, contrastRatio, ensureContrast, toCss, AA_NORMAL, AA_LARGE } from '../utils/contrast';

// ── Dynamic Text Contrast (seluruh portal) ───────────────────────────────────
// Memindai teks yang tampil, menghitung warna background efektif di belakangnya (menelusuri parent &
// menumpuk background transparan), lalu menyesuaikan warna teks yang sulit dibaca:
// teks terang untuk background gelap dan sebaliknya. Warna yang sudah memenuhi WCAG AA tidak diubah;
// yang kurang digeser seminimal mungkin (hue dipertahankan) sampai memenuhi AA.
// Elemen dapat dikecualikan dengan atribut data-contrast="off".

// Standar WCAG AA: teks normal minimal 4.5:1, teks besar/tebal minimal 3:1. Di bawahnya → dikoreksi.
const ORIG_ATTR = 'data-dc-orig'; // warna inline asli sebelum dikoreksi
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS', 'VIDEO', 'IMG', 'IFRAME', 'TEMPLATE']);
const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };

type Bg = RGBA | null; // null = tidak bisa diukur (gradient / gambar)

function hasOwnText(el: Element): boolean {
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === Node.TEXT_NODE && n.nodeValue && n.nodeValue.trim()) return true;
  }
  return FORM_TAGS.has(el.tagName) && el.getAttribute('type') !== 'checkbox' && el.getAttribute('type') !== 'radio' && el.getAttribute('type') !== 'range' && el.getAttribute('type') !== 'color';
}

function scanPass(root: Element, isCancelled: () => boolean, done: () => void) {
  const bgCache = new Map<Element, Bg>();

  const bgOf = (el: Element | null): Bg => {
    if (!el) return WHITE;
    const cached = bgCache.get(el);
    if (cached !== undefined) return cached;
    const cs = getComputedStyle(el);
    let result: Bg;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      result = null;
    } else {
      const own = parseColor(cs.backgroundColor);
      if (own && own.a >= 0.99) result = { ...own, a: 1 };
      else {
        const below = bgOf(el.parentElement);
        result = below === null ? null : own && own.a > 0 ? composite(own, below) : below;
      }
    }
    bgCache.set(el, result);
    return result;
  };

  // Kumpulkan elemen yang memiliki teks sendiri
  const targets: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: node => {
      const el = node as Element;
      if (SKIP_TAGS.has(el.tagName.toUpperCase()) || el.getAttribute('data-contrast') === 'off') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  if (root.nodeType === Node.ELEMENT_NODE && !root.closest('[data-contrast="off"], svg')) targets.push(root);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) targets.push(n as Element);

  let i = 0;
  const step = (deadline?: IdleDeadline) => {
    if (isCancelled()) return;
    // Selalu proses minimal satu batch (~8 ms) walau browser sibuk, agar pemindaian pasti selesai
    const budget = deadline && !deadline.didTimeout ? Math.max(deadline.timeRemaining(), 8) : 8;
    const until = performance.now() + budget;
    while (i < targets.length && performance.now() < until) {
      const el = targets[i++] as HTMLElement;
      if (!el.isConnected || !hasOwnText(el) || el.closest('[data-contrast="off"]')) continue;
      if (el.getClientRects().length === 0) continue; // tersembunyi
      checkElement(el, bgOf);
    }
    if (i < targets.length) schedule(step);
    else done();
  };
  schedule(step);
}

function checkElement(el: HTMLElement, bgOf: (el: Element | null) => Bg) {
  // Kembalikan dulu warna asli agar koreksi selalu dihitung dari warna desain (mis. setelah ganti tema)
  const corrected = el.hasAttribute(ORIG_ATTR);
  if (corrected) {
    const orig = el.getAttribute(ORIG_ATTR) || '';
    if (orig) el.style.setProperty('color', orig); else el.style.removeProperty('color');
  }
  const cs = getComputedStyle(el);
  const fg = parseColor(cs.color);
  const bg = bgOf(el);
  if (!fg || fg.a === 0 || !bg) {
    if (corrected) el.removeAttribute(ORIG_ATTR);
    return;
  }
  const effectiveFg = fg.a < 1 ? composite(fg, bg) : fg;
  const size = parseFloat(cs.fontSize) || 14;
  const bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
  const large = size >= 24 || (bold && size >= 18.66);
  const min = large ? AA_LARGE : AA_NORMAL;
  if (contrastRatio(effectiveFg, bg) >= min) {
    if (corrected) el.removeAttribute(ORIG_ATTR);
    return;
  }
  const fixed = ensureContrast(effectiveFg, bg, min);
  if (!corrected) el.setAttribute(ORIG_ATTR, el.style.getPropertyValue('color'));
  el.style.setProperty('color', toCss(fixed), 'important');
  if (FORM_TAGS.has(el.tagName)) el.style.setProperty('-webkit-text-fill-color', toCss(fixed), 'important');
}

function schedule(cb: (deadline?: IdleDeadline) => void) {
  if (typeof (window as any).requestIdleCallback === 'function') (window as any).requestIdleCallback(cb, { timeout: 500 });
  else setTimeout(() => cb(), 16);
}

export function ContrastGuard() {
  useEffect(() => {
    let cancelled = false;
    let running = false;
    let fullRescan = true;
    const pending = new Set<Element>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = () => {
      timer = null;
      if (cancelled || running) return;
      const roots: Element[] = fullRescan ? [document.body] : Array.from(pending).filter(el => el.isConnected);
      // Gabungkan root yang bertumpuk agar tidak dipindai dua kali
      const unique = roots.filter(r => !roots.some(o => o !== r && o.contains(r)));
      fullRescan = false;
      pending.clear();
      if (!unique.length) return;
      running = true;
      let left = unique.length;
      unique.forEach(r => scanPass(r, () => cancelled, () => {
        if (--left === 0) {
          running = false;
          if (pending.size || fullRescan) queue();
        }
      }));
    };
    const queue = (delay = 250) => {
      if (!timer) timer = setTimeout(run, delay);
    };

    const mo = new MutationObserver(records => {
      for (const r of records) {
        const target = r.target.nodeType === Node.ELEMENT_NODE ? (r.target as Element) : r.target.parentElement;
        if (!target) continue;
        if (r.type === 'childList' || r.type === 'characterData') pending.add(target);
        else if (r.type === 'attributes') pending.add(target);
        if (pending.size > 300) fullRescan = true;
      }
      queue();
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] });

    // Ganti tema (variabel CSS di <html>) → pindai ulang seluruh halaman
    const themeMo = new MutationObserver(() => { fullRescan = true; queue(100); });
    themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onScheme = () => { fullRescan = true; queue(100); };
    media?.addEventListener?.('change', onScheme);

    queue(600);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      mo.disconnect();
      themeMo.disconnect();
      media?.removeEventListener?.('change', onScheme);
    };
  }, []);
  return null;
}
