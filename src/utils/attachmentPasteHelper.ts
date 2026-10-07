/**
 * Helper global untuk menangani penempelan (Ctrl+V) file lampiran gambar dari clipboard
 * di seluruh aplikasi PrepLab Portal.
 */
import { toast } from 'sonner';

/**
 * Membaca file gambar dari event clipboard jika tersedia
 */
export function getImageFileFromClipboard(e: ClipboardEvent | React.ClipboardEvent): File | null {
  const items = e.clipboardData?.items;
  if (!items || items.length === 0) return null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }

  // Fallback to files list
  const files = e.clipboardData?.files;
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        return files[i];
      }
    }
  }

  return null;
}

/**
 * Mengonversi File menjadi base64 Data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Mendaftarkan listener global 'paste' di window untuk secara otomatis
 * memasukkan gambar clipboard (Ctrl+V) ke input attachment yang sedang aktif / terlihat.
 */
export function setupGlobalAttachmentPaste(): () => void {
  const handleGlobalPaste = async (e: ClipboardEvent) => {
    // Jika tidak ada gambar di clipboard, biarkan paste teks biasa bekerja normal
    const imageFile = getImageFileFromClipboard(e);
    if (!imageFile) return;

    // Cek apakah ada input teks/textarea yang sedang fokus
    const activeEl = document.activeElement as HTMLElement | null;
    const isTextInputFocused = activeEl && (
      activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type === 'text' ||
      activeEl.tagName === 'TEXTAREA'
    );

    // Jika clipboard HANYA berisi gambar dan bukan teks, kita intercept paste untuk attachment
    // karena input teks biasa tidak bisa menerima raw image file
    const hasPlainString = e.clipboardData?.types.includes('text/plain') && (e.clipboardData.getData('text/plain') || '').trim().length > 0;
    if (hasPlainString && isTextInputFocused) {
      // Jika clipboard mengandung teks yang valid dan pengguna sedang mengetik di input,
      // jangan potong paste teks kecuali input itu tidak butuh teks
      return;
    }

    try {
      const base64 = await fileToBase64(imageFile);

      // 1. Dispatch custom event agar modal/komponen aktif yang mendengarkan bisa langsung menerima
      const customEvent = new CustomEvent('portal:image_pasted', {
        detail: { file: imageFile, base64 },
        cancelable: true
      });
      const dispatched = window.dispatchEvent(customEvent);

      // Jika komponen aktif sudah menangani event ini dan memanggil preventDefault, kita selesai
      if (customEvent.defaultPrevented) {
        return;
      }

      // 2. Jika tidak ada listener khusus yang mencegah, cari input file terdekat atau yang terlihat
      // Prioritas 1: Input file di dalam modal / overlay aktif
      const modalSelectors = [
        '[role="dialog"]',
        '.fixed.z-50',
        '.fixed.inset-0',
        'aside[data-feedback-modal]',
        '.feedback-modal-container'
      ];
      let targetInput: HTMLInputElement | null = null;

      for (const sel of modalSelectors) {
        const modal = document.querySelector(sel);
        if (modal) {
          const inp = modal.querySelector('input[type="file"][accept*="image"]:not([disabled])') as HTMLInputElement | null;
          if (inp) {
            targetInput = inp;
            break;
          }
        }
      }

      // Prioritas 2: Cari input file gambar di sekitar elemen yang sedang fokus
      if (!targetInput && activeEl) {
        const container = activeEl.closest('form') || activeEl.closest('.modal') || activeEl.parentElement;
        if (container) {
          targetInput = container.querySelector('input[type="file"][accept*="image"]:not([disabled])') as HTMLInputElement | null;
        }
      }

      // Prioritas 3: Cari input file gambar visible di halaman
      if (!targetInput) {
        const allInputs = Array.from(document.querySelectorAll('input[type="file"][accept*="image"]:not([disabled])')) as HTMLInputElement[];
        targetInput = allInputs.find((inp) => {
          const rect = inp.getBoundingClientRect();
          const parentRect = inp.parentElement?.getBoundingClientRect();
          return (rect.width > 0 && rect.height > 0) || (parentRect && parentRect.width > 0 && parentRect.height > 0);
        }) || null;
      }

      if (targetInput) {
        e.preventDefault();
        const dt = new DataTransfer();
        dt.items.add(imageFile);
        targetInput.files = dt.files;
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        toast.success('Screenshot berhasil ditempel (Ctrl+V) dari clipboard! 📋');
      }
    } catch (err) {
      console.warn('[GlobalAttachmentPaste] Error:', err);
    }
  };

  window.addEventListener('paste', handleGlobalPaste);
  return () => window.removeEventListener('paste', handleGlobalPaste);
}
