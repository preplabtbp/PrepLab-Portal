/**
 * Helper utility to format and normalize avatar image URLs.
 * Handles Google Drive uc/export links by converting them to fast direct Google CDN (lh3) links,
 * while preserving base64 data URLs and standard URLs.
 *
 * `size` (opsional) meminta resolusi tertentu dari CDN Google (mis. 800 untuk foto profil HD).
 * Tanpa `size`, lh3 mengembalikan versi kecil bawaan.
 */
export function formatAvatarUrl(url?: string | null, size?: number): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === '-' || trimmed === '#N/A' || trimmed === 'null') return '';

  const withSize = (lh3Url: string) => {
    if (!size) return lh3Url;
    // Ganti parameter ukuran yang sudah ada (=s220, =w400-h400, dst.) atau tambahkan baru
    const base = lh3Url.replace(/=[swh]\d+[^/?#]*$/, '');
    return `${base}=s${size}`;
  };

  const isLocalDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.port !== ''
  );

  // If internal proxy /api/employees/photo/FILE_ID
  if (trimmed.startsWith('/api/employees/photo/')) {
    const fileId = trimmed.replace('/api/employees/photo/', '').trim();
    if (fileId) {
      if (isLocalDev) {
        return `/api/employees/photo/${fileId}`;
      }
      return withSize(`https://lh3.googleusercontent.com/d/${fileId}`);
    }
  }

  // Handle Google Drive links (both id= and /d/ formats)
  if (trimmed.includes('drive.google.com')) {
    const idMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      if (isLocalDev) {
        return `/api/employees/photo/${idMatch[1]}`;
      }
      return withSize(`https://lh3.googleusercontent.com/d/${idMatch[1]}`);
    }
  }

  if (trimmed.includes('lh3.googleusercontent.com')) {
    if (isLocalDev) {
      const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `/api/employees/photo/${match[1]}`;
      }
    }
    return withSize(trimmed);
  }

  return trimmed;
}

/**
 * Global fallback handler for image loading errors:
 * If Google CDN (lh3) fails, automatically fallbacks to internal authenticated proxy /api/employees/photo/:fileId
 */
export function handleAvatarError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  const match = target.src.match(/\/d\/([a-zA-Z0-9_-]+)/) || target.src.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1] && !target.src.includes('/api/employees/photo/')) {
    target.src = `/api/employees/photo/${match[1]}`;
  } else {
    target.style.display = 'none';
  }
}

