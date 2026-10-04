import dotenv from 'dotenv';
dotenv.config();
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
  CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
  CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
);

auth.setCredentials({
  refresh_token: REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN
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
    let uploadResponse;
    try {
      uploadResponse = await drive.files.create({
        supportsAllDrives: true,
        requestBody: {
          name: `${outputFileName}.pdf`,
          ...(folderId ? { parents: [folderId] } : {}),
        },
        media: {
          mimeType: 'application/pdf',
          body: exportResponse.data,
        },
        fields: 'id, webViewLink',
      });
    } catch (parentErr: any) {
      if (parentErr?.message?.includes('parent') || parentErr?.message?.includes('permission')) {
        console.warn(`Drive folder ${folderId} permission issue, falling back to upload without parent:`, parentErr.message);
        const fallbackExport = await drive.files.export(
          {
            fileId: tempDocId,
            mimeType: 'application/pdf',
          },
          { responseType: 'stream' }
        );
        uploadResponse = await drive.files.create({
          supportsAllDrives: true,
          requestBody: {
            name: `${outputFileName}.pdf`,
          },
          media: {
            mimeType: 'application/pdf',
            body: fallbackExport.data,
          },
          fields: 'id, webViewLink',
        });
      } else {
        throw parentErr;
      }
    }

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

export async function generateMonitoringPdfWithDynamicTable(options: {
  templateDocId: string;
  folderId: string;
  outputFileName: string;
  headerReplacements: Record<string, string>;
  tipe: 'SUHU' | 'GAS';
  tableRows: any[];
}) {
  const { templateDocId, folderId, outputFileName, headerReplacements, tipe, tableRows } = options;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error("Kredensial OAuth (Client ID, Secret, Refresh Token) belum diset di Environment Variables.");
  }

  // 1. Copy template with retry
  let copyResponse: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      copyResponse = await drive.files.copy({
        fileId: templateDocId,
        supportsAllDrives: true,
        requestBody: { name: `Temp_${outputFileName}` }
      });
      break;
    } catch (err: any) {
      if (attempt === 3) throw err;
      console.warn(`Retry ${attempt}/3 copying template for ${outputFileName} due to:`, err?.message || err);
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  const tempDocId = copyResponse.data.id;
  if (!tempDocId) throw new Error("Gagal menduplikasi template.");

  try {
    // 2. Fetch doc to find table and template row
    let docRes = await docs.documents.get({ documentId: tempDocId });
    let tableElem: any = null;
    let templateRowIdx = -1;

    const marker = tipe === 'SUHU' ? '<<Tanggal>>' : '<<Date>>';
    docRes.data.body?.content?.forEach((elem: any) => {
      if (elem.table) {
        elem.table.tableRows?.forEach((row: any, rIdx: number) => {
          let rowText = '';
          row.tableCells?.forEach((cell: any) => {
            cell.content?.forEach((c: any) => {
              c.paragraph?.elements?.forEach((pe: any) => {
                if (pe.textRun?.content) rowText += pe.textRun.content;
              });
            });
          });
          if (rowText.includes(marker) || (tipe === 'GAS' && rowText.includes('<<Flow>>'))) {
            tableElem = elem;
            templateRowIdx = rIdx;
          }
        });
      }
    });

    if (!tableElem || templateRowIdx === -1) {
      throw new Error(`Tabel template untuk ${tipe} tidak ditemukan di Google Docs.`);
    }

    // 3. Insert N - 1 rows if tableRows.length > 1
    if (tableRows.length > 1) {
      const insertRowReqs: any[] = [];
      for (let i = 0; i < tableRows.length - 1; i++) {
        insertRowReqs.push({
          insertTableRow: {
            tableCellLocation: {
              tableStartLocation: { index: tableElem.startIndex },
              rowIndex: templateRowIdx,
              columnIndex: 0
            },
            insertBelow: true
          }
        });
      }
      await docs.documents.batchUpdate({
        documentId: tempDocId,
        requestBody: { requests: insertRowReqs }
      });
    }

    // 4. Fetch updated doc to get fresh cell indices
    docRes = await docs.documents.get({ documentId: tempDocId });
    let updatedTable: any = null;
    docRes.data.body?.content?.forEach((elem: any) => {
      if (elem.table && elem.startIndex === tableElem.startIndex) {
        updatedTable = elem.table;
      }
    });

    // 5. Build text insertion requests for rows 1..N-1 and map signatures
    const signatureTagsMap: Record<string, string> = {};
    const textInsertRequests: { index: number; text: string }[] = [];

    function formatDriveImageUrl(urlOrId: string): string {
      if (!urlOrId || typeof urlOrId !== 'string') return '';
      const trimmed = urlOrId.trim();
      if (!trimmed || trimmed === '-' || trimmed === '✓ TTD') return '';
      const driveMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/) || trimmed.match(/id=([a-zA-Z0-9-_]+)/);
      if (driveMatch) {
        return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
      }
      if (!trimmed.startsWith('http') && /^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
        return `https://drive.google.com/uc?export=download&id=${trimmed}`;
      }
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
      return '';
    }

    const getRowValues = (d: any, idx: number) => {
      let ttdVal = '-';
      const rawSig = d.sigUrl || (d.ttd !== '✓ TTD' && d.ttd !== '-' ? d.ttd : '') || d.foto || '';
      const formattedSig = formatDriveImageUrl(rawSig);
      if (formattedSig) {
        const tag = `<<SIGTAG_ROW_${idx}>>`;
        signatureTagsMap[tag] = formattedSig;
        ttdVal = tag;
      } else if (d.ttd === '✓ TTD') {
        ttdVal = '✓ TTD';
      }

      if (tipe === 'SUHU') {
        return [
          d.tgl || '-',
          d.shift || '-',
          d.petugas || '-',
          d.jam || '-',
          d.suhu || '-',
          d.kel || '-',
          ttdVal
        ];
      } else {
        return [
          (idx + 1).toString(),
          d.tgl || '-',
          d.flow || '-',
          d.pressure || '-',
          d.shift || '-',
          d.pic || '-',
          d.y || '-',
          d.n || '-',
          d.remark || '-',
          ttdVal
        ];
      }
    };

    for (let r = 1; r < tableRows.length; r++) {
      const rowObj = updatedTable.tableRows[templateRowIdx + r];
      const d = tableRows[r];
      const vals = getRowValues(d, r);

      vals.forEach((val, cIdx) => {
        const cell = rowObj.tableCells[cIdx];
        const pElem = cell?.content?.[0]?.paragraph?.elements?.[0];
        if (pElem && typeof pElem.startIndex === 'number') {
          textInsertRequests.push({
            index: pElem.startIndex,
            text: String(val)
          });
        }
      });
    }

    // Sort descending by index so insertion doesn't invalidate subsequent indices
    textInsertRequests.sort((a, b) => b.index - a.index);

    const batchReqs: any[] = textInsertRequests.map(ir => ({
      insertText: {
        location: { index: ir.index },
        text: ir.text
      }
    }));

    // Row 0 replacements (the template row which contains <<Tanggal>>, etc.)
    const d0 = tableRows[0] || {};
    const row0Vals = getRowValues(d0, 0);

    const row0Replacements: Record<string, string> = {};
    if (tipe === 'SUHU') {
      row0Replacements['<<Tanggal>>'] = row0Vals[0];
      row0Replacements['<<Shift>>'] = row0Vals[1];
      row0Replacements['<<Petugas>>'] = row0Vals[2];
      row0Replacements['<<Jam>>'] = row0Vals[3];
      row0Replacements['<<Suhu>>'] = row0Vals[4];
      row0Replacements['<<Kelembapan>>'] = row0Vals[5];
      row0Replacements['<<TTD>>'] = row0Vals[6];
    } else {
      row0Replacements['<<No>>'] = row0Vals[0];
      row0Replacements['<<Date>>'] = row0Vals[1];
      row0Replacements['<<Flow>>'] = row0Vals[2];
      row0Replacements['<<Pressure>>'] = row0Vals[3];
      row0Replacements['<<Shift>>'] = row0Vals[4];
      row0Replacements['<<PIC>>'] = row0Vals[5];
      row0Replacements['<<Y>>'] = row0Vals[6];
      row0Replacements['<<N>>'] = row0Vals[7];
      row0Replacements['<<Remark>>'] = row0Vals[8];
      row0Replacements['<<TTD>>'] = row0Vals[9];
    }

    // Merge header replacements
    const allReplacements = { ...headerReplacements, ...row0Replacements };
    Object.entries(allReplacements).forEach(([tag, val]) => {
      batchReqs.push({
        replaceAllText: {
          containsText: { text: tag, matchCase: true },
          replaceText: val || '-'
        }
      });
    });

    await docs.documents.batchUpdate({
      documentId: tempDocId,
      requestBody: { requests: batchReqs }
    });

    // 5.5 Insert Signature Images into cells where SIGTAG_* was placed
    if (Object.keys(signatureTagsMap).length > 0) {
      docRes = await docs.documents.get({ documentId: tempDocId });
      const content = docRes.data.body?.content || [];

      const foundTags: { uniqueTag: string; url: string; startIndex: number; endIndex: number }[] = [];

      const searchElements = (elements: any[]) => {
        for (const el of elements) {
          if (el.paragraph) {
            for (const pEl of el.paragraph.elements) {
              if (pEl.textRun && pEl.textRun.content) {
                const text = pEl.textRun.content;
                for (const [uniqueTag, url] of Object.entries(signatureTagsMap)) {
                  const index = text.indexOf(uniqueTag);
                  if (index !== -1) {
                    foundTags.push({
                      uniqueTag,
                      url,
                      startIndex: pEl.startIndex! + index,
                      endIndex: pEl.startIndex! + index + uniqueTag.length
                    });
                    break; // Exactly one signature tag per cell
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

      const buildRequestsForTags = (items: typeof foundTags) => {
        const reqs: any[] = [];
        for (const item of items) {
          reqs.push({
            insertInlineImage: {
              uri: item.url,
              location: { index: item.startIndex },
              objectSize: {
                width: { magnitude: 45, unit: 'PT' },
                height: { magnitude: 25, unit: 'PT' }
              }
            }
          });
          reqs.push({
            deleteContentRange: {
              range: { startIndex: item.startIndex + 1, endIndex: item.endIndex + 1 }
            }
          });
        }
        return reqs;
      };

      const successfullyInsertedTags = new Set<string>();

      // Batch runner with divide-and-conquer fallback:
      // Tries to insert all images in a single batchUpdate.
      // If a batch fails (e.g. 1 broken image URL), it splits into halves so all valid
      // signatures succeed while staying well within the Google Docs API write quota (60 req/min).
      const insertBatch = async (items: typeof foundTags) => {
        if (items.length === 0) return;
        try {
          const reqs = buildRequestsForTags(items);
          await docs.documents.batchUpdate({
            documentId: tempDocId,
            requestBody: { requests: reqs }
          });
          items.forEach(it => successfullyInsertedTags.add(it.uniqueTag));
        } catch (batchErr: any) {
          if (items.length === 1) {
            console.warn(`Gagal menyisipkan inline signature untuk tag ${items[0].uniqueTag} (${items[0].url}):`, batchErr?.message || batchErr);
            return;
          }
          const mid = Math.floor(items.length / 2);
          const firstHalf = items.slice(0, mid);
          const secondHalf = items.slice(mid);
          await insertBatch(firstHalf);
          await insertBatch(secondHalf);
        }
      };

      await insertBatch(foundTags);

      // Final cleanup: Any tag in signatureTagsMap that wasn't replaced with an image
      // (due to image download failure, missing from foundTags, etc.) MUST be replaced with '✓ TTD'.
      // This guarantees no raw <<SIGTAG_ROW_*>> tags ever leak into the generated PDF.
      const remainingTags = Object.keys(signatureTagsMap).filter(t => !successfullyInsertedTags.has(t));
      if (remainingTags.length > 0) {
        const cleanupRequests = remainingTags.map(tag => ({
          replaceAllText: {
            containsText: { text: tag, matchCase: true },
            replaceText: '✓ TTD'
          }
        }));
        try {
          await docs.documents.batchUpdate({
            documentId: tempDocId,
            requestBody: { requests: cleanupRequests }
          });
        } catch (cleanErr: any) {
          console.error("Gagal membersihkan sisa tag signature:", cleanErr?.message || cleanErr);
        }
      }
    }

    // 6. Export PDF
    const exportResponse = await drive.files.export(
      {
        fileId: tempDocId,
        mimeType: 'application/pdf',
      },
      { responseType: 'stream' }
    );

    let uploadResponse;
    try {
      uploadResponse = await drive.files.create({
        supportsAllDrives: true,
        requestBody: {
          name: `${outputFileName}.pdf`,
          ...(folderId ? { parents: [folderId] } : {}),
        },
        media: {
          mimeType: 'application/pdf',
          body: exportResponse.data,
        },
        fields: 'id, webViewLink',
      });
    } catch (parentErr: any) {
      if (parentErr?.message?.includes('parent') || parentErr?.message?.includes('permission')) {
        console.warn(`Drive folder ${folderId} permission issue, falling back to upload without parent:`, parentErr.message);
        const fallbackExport = await drive.files.export(
          {
            fileId: tempDocId,
            mimeType: 'application/pdf',
          },
          { responseType: 'stream' }
        );
        uploadResponse = await drive.files.create({
          supportsAllDrives: true,
          requestBody: {
            name: `${outputFileName}.pdf`,
          },
          media: {
            mimeType: 'application/pdf',
            body: fallbackExport.data,
          },
          fields: 'id, webViewLink',
        });
      } else {
        throw parentErr;
      }
    }

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

    return {
      success: true,
      pdfUrl: uploadResponse.data.webViewLink,
      pdfId: newPdfId
    };
  } catch (error: any) {
    console.error("Error di generateMonitoringPdfWithDynamicTable:", error);
    throw new Error(error.message);
  } finally {
    await drive.files.delete({ fileId: tempDocId, supportsAllDrives: true }).catch(() => {});
  }
}

