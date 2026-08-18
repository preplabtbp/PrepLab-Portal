import { google } from 'googleapis';

/**
 * Admin Refresh Token Credentials (OAuth2)
 * Pastikan Anda mengisi environment variable ini di platform (AI Studio / Server Anda)
 */
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Inisialisasi Auth Client menggunakan OAuth2
const auth = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET
);

auth.setCredentials({
  refresh_token: REFRESH_TOKEN
});

export const drive = google.drive({ version: 'v3', auth });
export const docs = google.docs({ version: 'v1', auth });

/**
 * Fungsi untuk menduplikasi template, me-replace tags, dan mengembalikan URL PDF
 * 
 * @param templateDocId ID dari file Template Google Docs utama
 * @param folderId ID dari Folder Google Drive tempat PDF akan disimpan
 * @param replacements Object key-value untuk replace teks (contoh: { '<<NAMA>>': 'Budi', '<<JABATAN>>': 'Manager' })
 * @param outputFileName Nama file PDF yang diinginkan
 * @returns Object berisi url PDF yang bisa didownload
 */
export async function generatePdfFromTemplate(
  templateDocId: string,
  folderId: string,
  replacements: Record<string, string>,
  outputFileName: string,
  images?: Record<string, string>
) {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      throw new Error("Kredensial OAuth (Client ID, Secret, Refresh Token) belum diset di Environment Variables.");
    }

    // 1. Duplikasi Template
    const copyResponse = await drive.files.copy({
      fileId: templateDocId,
      supportsAllDrives: true,
      requestBody: {
        name: `Temp_${outputFileName}`,
      },
    });
    
    const tempDocId = copyResponse.data.id;
    if (!tempDocId) throw new Error("Gagal menduplikasi template.");

    // 2. Siapkan Request untuk Replace Text
    const requests = Object.entries(replacements).map(([tag, value]) => ({
      replaceAllText: {
        containsText: {
          text: tag,
          matchCase: true,
        },
        replaceText: value || '-',
      },
    }));

    // Pre-processing untuk tags gambar: kita replace dengan unique tag tanpa special chars 
    // agar disatukan dalam satu textRun oleh Google Docs
    const imageTagsMap: any = {};
    if (images && Object.keys(images).length > 0) {
      Object.keys(images).forEach((tag, idx) => {
        const uniqueTag = `IMGTAG${idx}`;
        imageTagsMap[uniqueTag] = { originalTag: tag, url: images[tag] };
        
        requests.push({
          replaceAllText: {
            containsText: { text: tag, matchCase: true },
            replaceText: uniqueTag,
          }
        });
      });
    }

    // 3. Jalankan Replace Text di dokumen sementara
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: tempDocId,
        requestBody: {
          requests,
        },
      });
    }

    // 3.5 Jalankan Replace Images
    if (images && Object.keys(images).length > 0) {
      const docRes = await docs.documents.get({ documentId: tempDocId });
      const content = docRes.data.body?.content || [];
      
      const foundTags: { uniqueTag: string, url: string, startIndex: number, endIndex: number }[] = [];
      
      const searchElements = (elements: any[]) => {
        for (const el of elements) {
          if (el.paragraph) {
            for (const pEl of el.paragraph.elements) {
              if (pEl.textRun && pEl.textRun.content) {
                const text = pEl.textRun.content;
                for (const [uniqueTag, data] of Object.entries(imageTagsMap) as any) {
                  if (data.url) {
                      const index = text.indexOf(uniqueTag);
                      if (index !== -1) {
                        foundTags.push({
                          uniqueTag,
                          url: data.url,
                          startIndex: pEl.startIndex! + index,
                          endIndex: pEl.startIndex! + index + uniqueTag.length
                        });
                      }
                  }
                }
              }
            }
          } else if (el.table) {
            for (const row of el.table.tableRows) {
              for (const cell of row.tableCells) {
                if (cell.content) searchElements(cell.content);
              }
            }
          }
        }
      };
      
      searchElements(content);
      foundTags.sort((a, b) => b.startIndex - a.startIndex);
      
      const imgRequests: any[] = [];
      for (const item of foundTags) {
          let finalUrl = item.url;
          // Support for FreeImage url directly
          const driveMatch = item.url.match(/\/d\/([a-zA-Z0-9-_]+)/) || item.url.match(/id=([a-zA-Z0-9-_]+)/);
          if (driveMatch) {
              finalUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
          }
          
          imgRequests.push({
             insertInlineImage: {
                uri: finalUrl,
                location: { index: item.startIndex },
                objectSize: { width: { magnitude: 200, unit: 'PT' } } // Fixed at 200 PT for now
             }
          });
          imgRequests.push({
             deleteContentRange: {
                // Since we delete after inserting at startIndex, the original text shifted by +1
                range: { startIndex: item.startIndex + 1, endIndex: item.endIndex + 1 }
             }
          });
      }
      
      if (imgRequests.length > 0) {
        await docs.documents.batchUpdate({
          documentId: tempDocId,
          requestBody: {
            requests: imgRequests,
          },
        });
      } else {
        // If the tags were not found, we might want to replace them with text to clean up
        const cleanupRequests = Object.keys(imageTagsMap).map((uniqueTag) => ({
          replaceAllText: {
            containsText: { text: uniqueTag, matchCase: true },
            replaceText: '(Tidak ada gambar)',
          },
        }));
        await docs.documents.batchUpdate({
          documentId: tempDocId,
          requestBody: { requests: cleanupRequests },
        });
      }
    }

    // 4. Ekspor dokumen ke PDF (Ini mengembalikan data stream berupa PDF)
    const exportResponse = await drive.files.export(
      {
        fileId: tempDocId,
        mimeType: 'application/pdf',
      },
      { responseType: 'stream' }
    );

    // 5. Upload stream PDF tersebut ke Folder tujuan di Google Drive
    const uploadResponse = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: `${outputFileName}.pdf`,
        parents: [folderId],
      },
      media: {
        mimeType: 'application/pdf',
        body: exportResponse.data,
      },
      fields: 'id, webViewLink',
    });

    // Buat file PDF-nya bisa dibaca oleh siapa saja yang punya link (jika diinginkan)
    const newPdfId = uploadResponse.data.id;
    if (newPdfId) {
      await drive.permissions.create({
        fileId: newPdfId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    }

    // 6. Hapus dokumen sementara
    await drive.files.delete({
      fileId: tempDocId,
    });

    return {
      success: true,
      pdfUrl: uploadResponse.data.webViewLink,
      pdfId: newPdfId
    };
  } catch (error: any) {
    console.error("Error di generatePdfFromTemplate:", error);
    throw new Error(error.message);
  }
}
