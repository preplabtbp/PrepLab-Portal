import { Router } from "express";
import { Readable } from "stream";
import { drive } from "../../google-services.js";
import { db } from "../../src/db/index.js";
import { uploadedFiles } from "../../src/db/schema.js";

export const galleryRouter = Router();

const ROOT_SHARED_DRIVE_ID = '1JJZKj7X1vsNNP5dTWDYJ_-0xYVhU0Bu7';
let cachedGaleriFolderId: string | null = null;

/**
 * Mencari atau membuat folder "Galeri Portal" di Google Drive
 */
async function getOrCreateGaleriPortalFolder(): Promise<string> {
  if (cachedGaleriFolderId) {
    try {
      const check = await drive.files.get({
        fileId: cachedGaleriFolderId,
        fields: 'id, trashed',
        supportsAllDrives: true
      });
      if (check.data?.id && !check.data?.trashed) {
        return cachedGaleriFolderId;
      }
    } catch (e) {
      cachedGaleriFolderId = null;
    }
  }

  // 1. Cari folder "Galeri Portal" yang belum masuk tempat sampah
  const query = "mimeType='application/vnd.google-apps.folder' and name='Galeri Portal' and trashed=false";
  const searchRes = await drive.files.list({
    q: query,
    fields: 'files(id, name, parents)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    cachedGaleriFolderId = searchRes.data.files[0].id!;
    console.log(`[Galeri Portal] Ditemukan folder Drive yang sudah ada: ${cachedGaleriFolderId}`);
    return cachedGaleriFolderId;
  }

  // 2. Buat folder baru "Galeri Portal" jika belum ada
  console.log('[Galeri Portal] Membuat folder baru "Galeri Portal" di Google Drive...');
  try {
    const createRes = await drive.files.create({
      requestBody: {
        name: 'Galeri Portal',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [ROOT_SHARED_DRIVE_ID]
      },
      fields: 'id',
      supportsAllDrives: true
    });
    cachedGaleriFolderId = createRes.data.id!;

    // Set permission agar folder dapat dibaca publik
    await drive.permissions.create({
      fileId: cachedGaleriFolderId,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true
    }).catch(() => {});

    console.log(`[Galeri Portal] Berhasil membuat folder Drive: ${cachedGaleriFolderId}`);
    return cachedGaleriFolderId;
  } catch (err: any) {
    console.warn('[Galeri Portal] Gagal membuat di shared drive parent, mencoba di root:', err.message);
    const fallbackRes = await drive.files.create({
      requestBody: {
        name: 'Galeri Portal',
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id',
      supportsAllDrives: true
    });
    cachedGaleriFolderId = fallbackRes.data.id!;
    return cachedGaleriFolderId;
  }
}

/**
 * GET /api/portal-gallery and GET /api/gallery/drive
 * Mengambil daftar gambar yang tersimpan di folder "Galeri Portal" di Google Drive
 */
galleryRouter.get(["/api/portal-gallery", "/api/gallery/drive", "/api/gallery"], async (req, res, next) => {
  // If request contains week query parameter, pass through to miscRouter
  if (req.query.week) {
    return next();
  }
  try {
    const folderId = await getOrCreateGaleriPortalFolder();

    const query = `'${folderId}' in parents and trashed=false and (mimeType contains 'image/' or name contains '.png' or name contains '.jpg' or name contains '.jpeg' or name contains '.webp' or name contains '.gif')`;
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, thumbnailLink, createdTime, size, webViewLink)',
      orderBy: 'createdTime desc',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    const files = (response.data.files || []).map((f) => {
      // Gunakan streaming view proxy bawaan portal agar tidak ada kendala CORS / token
      const proxyUrl = `/api/drive/view/${f.id}`;
      return {
        id: f.id,
        name: f.name || 'Gambar Portal',
        mimeType: f.mimeType || 'image/jpeg',
        url: proxyUrl,
        thumbnail: proxyUrl,
        size: f.size ? parseInt(f.size, 10) : 0,
        createdTime: f.createdTime || new Date().toISOString()
      };
    });

    res.json({
      success: true,
      folderId,
      total: files.length,
      files
    });
  } catch (err: any) {
    console.error("[Galeri Portal API] Gagal memuat galeri:", err.message);
    res.status(500).json({
      success: false,
      error: "Gagal memuat galeri portal dari Google Drive",
      details: err.message,
      files: []
    });
  }
});

/**
 * POST /api/gallery/upload and POST /api/portal-gallery/upload
 * Mengunggah gambar baru langsung ke folder "Galeri Portal" di Google Drive
 */
galleryRouter.post(["/api/portal-gallery/upload", "/api/gallery/upload"], async (req, res) => {
  try {
    const { base64Data, mimeType: rawMime, filename: rawFilename } = req.body;

    if (!base64Data) {
      return res.status(400).json({ success: false, error: "base64Data wajib disertakan" });
    }

    const folderId = await getOrCreateGaleriPortalFolder();

    // Deteksi mimeType dan filename
    let detectedMime = rawMime || 'image/jpeg';
    const mimeMatch = base64Data.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    if (mimeMatch && mimeMatch[1]) {
      detectedMime = mimeMatch[1];
    }

    let ext = 'jpg';
    if (detectedMime.includes('png')) ext = 'png';
    else if (detectedMime.includes('webp')) ext = 'webp';
    else if (detectedMime.includes('gif')) ext = 'gif';
    else if (detectedMime.includes('svg')) ext = 'svg';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const cleanFilename = rawFilename
      ? rawFilename.replace(/\s+/g, '_')
      : `Portal_Img_${timestamp}.${ext}`;

    // Konversi base64 ke stream buffer
    const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(base64Clean, 'base64');

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    try {
      const driveRes = await drive.files.create({
        requestBody: {
          name: cleanFilename,
          parents: [folderId]
        },
        media: {
          mimeType: detectedMime,
          body: stream
        },
        fields: 'id, name, mimeType, webViewLink, createdTime, size',
        supportsAllDrives: true
      });

      const fileId = driveRes.data.id!;

      // Pastikan hak akses publik reader
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        },
        supportsAllDrives: true
      }).catch((permErr) => {
        console.warn('[Galeri Portal] Gagal set public permission:', permErr.message);
      });

      const proxyUrl = `/api/drive/view/${fileId}`;

      return res.json({
        success: true,
        file: {
          id: fileId,
          name: cleanFilename,
          url: proxyUrl,
          thumbnail: proxyUrl,
          mimeType: detectedMime,
          size: buffer.length,
          createdTime: driveRes.data.createdTime || new Date().toISOString()
        }
      });
    } catch (driveErr: any) {
      console.error('[Galeri Portal] Drive upload error, fallback to local database:', driveErr.message);
      
      // Fallback cadangan ke database uploadedFiles jika Google Drive sedang rate-limited
      const dbInsert = await db.insert(uploadedFiles).values({
        filename: cleanFilename,
        mimeType: detectedMime,
        base64Data: base64Data
      }).returning();

      const dbUrl = `/api/files/${dbInsert[0].id}`;

      return res.json({
        success: true,
        file: {
          id: String(dbInsert[0].id),
          name: cleanFilename,
          url: dbUrl,
          thumbnail: dbUrl,
          mimeType: detectedMime,
          size: buffer.length,
          createdTime: new Date().toISOString()
        }
      });
    }
  } catch (err: any) {
    console.error("[Galeri Portal API] Upload error:", err.message);
    res.status(500).json({
      success: false,
      error: "Gagal mengunggah gambar ke Galeri Portal",
      details: err.message
    });
  }
});

/**
 * DELETE /api/gallery/:fileId and DELETE /api/portal-gallery/:fileId
 * Menghapus gambar dari Galeri Portal (ke tempat sampah Drive)
 */
galleryRouter.delete(["/api/portal-gallery/:fileId", "/api/gallery/:fileId"], async (req, res) => {
  try {
    const fileId = req.params.fileId;
    if (!fileId) return res.status(400).json({ success: false, error: "fileId tidak valid" });

    await drive.files.update({
      fileId,
      requestBody: { trashed: true },
      supportsAllDrives: true
    });

    res.json({ success: true, message: "File berhasil dipindahkan ke tempat sampah" });
  } catch (err: any) {
    console.error("[Galeri Portal API] Delete error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
