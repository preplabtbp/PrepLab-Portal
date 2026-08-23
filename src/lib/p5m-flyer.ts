/**
 * Helper to parse and format Google Drive and P5M flyer URLs
 * for seamless iframe embedding, thumbnail rendering, and downloads.
 */

export function parseGoogleDriveId(url?: string | null): string | null {
  if (!url) return null;
  const mId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (mId) return mId[1];
  const mFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (mFileD) return mFileD[1];
  const mD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (mD) return mD[1];
  return null;
}

export interface FlyerInfo {
  isPdf: boolean;
  fileId: string | null;
  embedUrl: string;
  imageUrl: string;
  viewUrl: string;
  streamUrl: string;
  downloadUrl: string;
}

export function getFlyerInfo(rawUrl?: string | null, title?: string | null): FlyerInfo {
  const cleanTitle = (title || '').trim();
  const cleanUrl = (rawUrl || '').trim();

  const isPdf = Boolean(
    cleanUrl.toLowerCase().includes('.pdf') ||
    cleanTitle.toLowerCase().includes('.pdf') ||
    cleanTitle.startsWith('IK ') ||
    cleanTitle.startsWith('SOP ')
  );

  const fileId = parseGoogleDriveId(cleanUrl);

  const safeTitle = encodeURIComponent(cleanTitle || 'Flyer_P5M');
  const streamUrl = `/api/p5m/flyer?title=${safeTitle}`;
  const downloadUrl = `/api/p5m/flyer?download=true&title=${safeTitle}`;

  if (fileId) {
    return {
      isPdf,
      fileId,
      // Official Google Drive embed URL that works inside iframe:
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      // Google CDN thumbnail endpoint for image tag (never blocked by hotlinking / CORS):
      imageUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
      // Direct link to view file on Google Drive in a new tab:
      viewUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
      streamUrl,
      downloadUrl
    };
  }

  // Local / direct external URLs
  return {
    isPdf,
    fileId: null,
    embedUrl: cleanUrl || streamUrl,
    imageUrl: cleanUrl || streamUrl,
    viewUrl: cleanUrl || streamUrl,
    streamUrl,
    downloadUrl
  };
}
