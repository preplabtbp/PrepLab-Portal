import { useState, useEffect } from 'react';

export type MobileDisplayMode = 'simple' | 'full';

const STORAGE_KEY = 'preplab_mobile_display_mode';

export function getStoredMobileMode(): MobileDisplayMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'simple' || saved === 'full') {
      return saved;
    }
  } catch {
    // ignore
  }
  // Default for mobile is 'simple'
  return 'simple';
}

export function setStoredMobileMode(mode: MobileDisplayMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent('mobile-mode-changed', { detail: { mode } }));
  } catch {
    // ignore
  }
}

export function useMobileMode() {
  const [mode, setMode] = useState<MobileDisplayMode>(() => getStoredMobileMode());
  const [isMobileWidth, setIsMobileWidth] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileWidth(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleModeChanged = (e: any) => {
      if (e.detail?.mode) {
        setMode(e.detail.mode);
      } else {
        setMode(getStoredMobileMode());
      }
    };
    window.addEventListener('mobile-mode-changed', handleModeChanged);
    return () => window.removeEventListener('mobile-mode-changed', handleModeChanged);
  }, []);

  const setMobileMode = (newMode: MobileDisplayMode) => {
    setStoredMobileMode(newMode);
    setMode(newMode);
  };

  const toggleMobileMode = () => {
    const next = mode === 'simple' ? 'full' : 'simple';
    setMobileMode(next);
  };

  const isSimpleActive = isMobileWidth && mode === 'simple';

  return {
    mode,
    isMobileWidth,
    isSimpleActive,
    setMobileMode,
    toggleMobileMode
  };
}
