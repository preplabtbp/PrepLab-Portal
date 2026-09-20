export type FontSizeOption = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface FontSizeConfig {
  id: FontSizeOption;
  label: string;
  desc: string;
  size: string;
}

export const FONT_SIZE_OPTIONS: FontSizeConfig[] = [
  { id: 'xs', label: 'Extra Small', desc: '85%', size: '13.5px' },
  { id: 'sm', label: 'Small', desc: '92%', size: '14.75px' },
  { id: 'md', label: 'Medium (Default)', desc: '100%', size: '16px' },
  { id: 'lg', label: 'Large', desc: '110%', size: '17.5px' },
  { id: 'xl', label: 'Extra Large', desc: '120%', size: '19px' },
];

const STORAGE_KEY = 'preplab_portal_font_size';

export function getStoredFontSize(): FontSizeOption {
  if (typeof window === 'undefined') return 'md';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as FontSizeOption;
    if (saved && ['xs', 'sm', 'md', 'lg', 'xl'].includes(saved)) {
      return saved;
    }
  } catch (e) {
    console.error('Error reading font size from localStorage:', e);
  }
  return 'md';
}

export function applyFontSize(size: FontSizeOption): void {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  // Remove existing font-size classes
  html.classList.remove(
    'font-size-xs',
    'font-size-sm',
    'font-size-md',
    'font-size-lg',
    'font-size-xl'
  );

  // Add selected font-size class
  html.classList.add(`font-size-${size}`);

  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch (e) {
    console.error('Error saving font size to localStorage:', e);
  }

  // Dispatch custom event for reactive components if needed
  window.dispatchEvent(
    new CustomEvent('portal-font-size-changed', { detail: { size } })
  );
}

export function initFontSize(): FontSizeOption {
  const current = getStoredFontSize();
  applyFontSize(current);
  return current;
}
