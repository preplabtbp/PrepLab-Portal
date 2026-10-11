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

  // If internal proxy /api/employees/photo/FILE_ID, convert to Google lh3 CDN for instant caching
  if (trimmed.startsWith('/api/employees/photo/')) {
    const fileId = trimmed.replace('/api/employees/photo/', '').trim();
    if (fileId) {
      return withSize(`https://lh3.googleusercontent.com/d/${fileId}`);
    }
  }

  // Handle Google Drive links (both id= and /d/ formats)
  if (trimmed.includes('drive.google.com')) {
    const idMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return withSize(`https://lh3.googleusercontent.com/d/${idMatch[1]}`);
    }
  }

  if (trimmed.includes('lh3.googleusercontent.com')) {
    return withSize(trimmed);
  }

  return trimmed;
}
