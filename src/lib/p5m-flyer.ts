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

  const fileId = parseGoogleDriveId(cleanUrl);

  const isPdf = Boolean(
    fileId ||
    cleanUrl.toLowerCase().includes('.pdf') ||
    cleanTitle.toLowerCase().includes('.pdf') ||
    cleanTitle.startsWith('IK ') ||
    cleanTitle.startsWith('SOP ') ||
    cleanTitle.startsWith('JSA ')
  );

  const safeTitle = encodeURIComponent(cleanTitle || 'Dokumen_P5M');
  const safeUrl = encodeURIComponent(cleanUrl || '');

  // Backend streaming endpoint (public endpoint with fallback)
  const streamUrl = `/api/p5m/flyer?title=${safeTitle}${cleanUrl ? `&url=${safeUrl}` : ''}`;

  if (fileId) {
    const drivePreviewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    const driveViewUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    const driveImageUrl = `/api/drive/view/${fileId}`;

    return {
      isPdf: true,
      fileId,
      // Direct Google Drive embed viewer for seamless iframe rendering with native zoom and controls:
      embedUrl: drivePreviewUrl,
      imageUrl: driveImageUrl,
      viewUrl: driveViewUrl,
      streamUrl,
      downloadUrl: driveDownloadUrl
    };
  }

  // Local / direct external URLs
  const isDirectPdf = cleanUrl.toLowerCase().includes('.pdf') || cleanTitle.toLowerCase().includes('.pdf');
  const embedUrl = isDirectPdf && cleanUrl.startsWith('http')
    ? streamUrl
    : (cleanUrl || streamUrl);

  const downloadUrl = `/api/p5m/flyer?download=true&title=${safeTitle}${cleanUrl ? `&url=${safeUrl}` : ''}`;

  return {
    isPdf,
    fileId: null,
    embedUrl,
    imageUrl: streamUrl,
    viewUrl: cleanUrl || streamUrl,
    streamUrl,
    downloadUrl
  };
}
