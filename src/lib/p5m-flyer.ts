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
  isExcel: boolean;
  fileId: string | null;
  embedUrl: string;
  imageUrl: string;
  viewUrl: string;
  streamUrl: string;
  downloadUrl: string;
  driveViewUrl?: string;
  drivePreviewUrl?: string;
}

export function getFlyerInfo(rawUrl?: string | null, title?: string | null): FlyerInfo {
  const cleanTitle = (title || '').trim();
  const cleanUrl = (rawUrl || '').trim();
  const lowerUrl = cleanUrl.toLowerCase();
  const lowerTitle = cleanTitle.toLowerCase();

  const fileId = parseGoogleDriveId(cleanUrl);

  const isExcel = Boolean(
    lowerUrl.includes('.xlsx') ||
    lowerUrl.includes('.xls') ||
    lowerTitle.includes('.xlsx') ||
    lowerTitle.includes('.xls')
  );

  const isPdf = !isExcel && Boolean(
    fileId ||
    lowerUrl.includes('.pdf') ||
    lowerTitle.includes('.pdf') ||
    /\b(sop|ik)\b|instruksi kerja/i.test(cleanTitle) ||
    cleanTitle.startsWith('IK ') ||
    cleanTitle.startsWith('SOP ') ||
    cleanTitle.startsWith('JSA ') ||
    cleanTitle.startsWith('JSA -') ||
    cleanTitle.includes('JSA')
  );

  const safeTitle = encodeURIComponent(cleanTitle || 'Dokumen_P5M');
  const safeUrl = encodeURIComponent(cleanUrl || '');

  // Backend streaming endpoint (authenticated service account proxy - zero permission wall)
  const streamUrl = `/api/p5m/flyer?title=${safeTitle}${cleanUrl ? `&url=${safeUrl}` : ''}`;

  if (fileId) {
    const drivePreviewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    const driveViewUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    const driveDownloadUrl = `/api/p5m/flyer?download=true&title=${safeTitle}&url=${safeUrl}`;
    const driveImageUrl = `/api/drive/view/${fileId}`;

    return {
      isPdf,
      isExcel,
      fileId,
      // Default to streamUrl so Google Drive 'Akses dibatasi' permission prompt never blocks regular employees:
      embedUrl: streamUrl,
      imageUrl: driveImageUrl,
      viewUrl: streamUrl,
      streamUrl,
      downloadUrl: driveDownloadUrl,
      driveViewUrl,
      drivePreviewUrl
    };
  }

  // Local / direct external URLs
  const isDirectPdf = lowerUrl.includes('.pdf') || lowerTitle.includes('.pdf');
  const embedUrl = isDirectPdf && cleanUrl.startsWith('http')
    ? streamUrl
    : (cleanUrl || streamUrl);

  const downloadUrl = `/api/p5m/flyer?download=true&title=${safeTitle}${cleanUrl ? `&url=${safeUrl}` : ''}`;

  return {
    isPdf,
    isExcel,
    fileId: null,
    embedUrl,
    imageUrl: streamUrl,
    viewUrl: cleanUrl || streamUrl,
    streamUrl,
    downloadUrl
  };
}
