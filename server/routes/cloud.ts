import { Router } from "express";
import { Readable } from "stream";
import { db } from "../../src/db/index.js";
import { eq, desc, or, inArray, isNull, and, gte, lte } from "drizzle-orm";
import { 
  chatMessages, employees, equipments, workOrders, users, tickets, downtime, 
  spareparts, apdSettings, apdHistory, apdDocuments, roster, inspections, 
  pemantauan, questions, agendaEvents, privateNotes, userThemes, bulletinPosts, 
  notifications, bulletinComments, uploadedFiles, appSettings, pelanggaran, 
  mealReports, pushSubscriptions, quizQuestions, preplabCloudLogs, quizScores, induksi
} from "../../src/db/schema.js";
import { generatePdfFromTemplate, drive } from '../../google-services.js';
import { 
  sendWebPush, getUniverse, uploadFileToDrive, syncBulletinToAgenda, 
  getNotificationTargets, getTableObj, sanitizePayload 
} from "../utils.js";
import webpush from 'web-push';
import path from "path";

export const router = Router();

router.post("/api/upload", async (req, res) => {
    try {
      const { base64Data, mimeType, filename, folderName } = req.body;
      
      const folderId = '1JJZKj7X1vsNNP5dTWDYJ_-0xYVhU0Bu7'; // Shared Drive folder id

      let finalFolderId = folderId;
      if (folderName === 'Work Orders' || folderName === 'Internal Tickets') {
         finalFolderId = '1V_qxWLDAwcdV6O8Eg723fqMcZSeRIzoe'; // Folder Dokumentasi
      }
      else if (folderName === 'Materi Briefing External' || folderName === 'Briefing External' || folderName === 'P5M External') {
         finalFolderId = process.env.GDRIVE_BRIEFING_EXTERNAL_FOLDER_ID || '1a0yxvL7KTPQQK_qhxtl-PpHQNTsqoAUV';
      }
      else if (folderName === 'Materi Briefing Internal' || folderName === 'Briefing Internal' || folderName === 'P5M Internal') {
         finalFolderId = process.env.GDRIVE_BRIEFING_INTERNAL_FOLDER_ID || '1850C4AAefTc_lgx7Jlg9fM7SpyGlQn-9';
      }
      else if (folderName === 'Bulletin Board' || folderName === 'Bulletin' || folderName === 'Bulletin Attachments' || folderName === 'Manajemen Mutu') {
         finalFolderId = process.env.GDRIVE_BULLETIN_ATTACHMENTS_FOLDER_ID || '1JE6EusixbK7saIzboKNOk9aMiAqEX-zF';
      }
      else if (folderName) {
         try {
           const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${folderId}' in parents and trashed=false`;
           const searchRes = await drive.files.list({ q: query, fields: 'files(id, name)', supportsAllDrives: true, includeItemsFromAllDrives: true });
           if (searchRes.data.files && searchRes.data.files.length > 0) {
             finalFolderId = searchRes.data.files[0].id;
           } else {
             const folderMetadata = { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [folderId] };
             const createRes = await drive.files.create({ requestBody: folderMetadata, fields: 'id', supportsAllDrives: true });
             finalFolderId = createRes.data.id;
           }
         } catch(e) {
           console.error("Gagal create folder, pakai folder default", e);
         }
      }
      // 3. Konversi base64 ke stream
      const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Clean, 'base64');
      
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      // 4. Upload ke Drive
      const cleanFilename = (filename || 'uploaded_file').replace(/\.jpeg$/i, '.jpg');
      const fileMetadata = {
        name: cleanFilename,
        parents: [finalFolderId]
      };
      const media = {
        mimeType: mimeType || 'application/octet-stream',
        body: stream
      };
      
      try {
        // Fast race timeout (5s) for Google Drive to prevent hanging UI
        const driveTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Google Drive upload timed out after 5s')), 5000)
        );

        const driveUploadPromise = drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id, webViewLink, webContentLink',
          supportsAllDrives: true
        });

        const response: any = await Promise.race([driveUploadPromise, driveTimeout]);
        const fileId = response.data?.id;

        if (fileId) {
          // Asynchronous non-blocking permission update (never blocks the HTTP response)
          drive.permissions.create({
            fileId: fileId,
            requestBody: { role: 'reader', type: 'anyone' },
            supportsAllDrives: true
          }).catch(pErr => console.warn('[Drive Permission Notice]', pErr?.message));

          const directUrl = `/api/drive/view/${fileId}`;
          return res.json({ url: directUrl, fileId: fileId });
        } else {
          throw new Error('No fileId returned from Drive');
        }
      } catch (driveErr: any) {
        console.warn('Drive upload slow or error, instant fallback to database storage:', driveErr?.message);
        const result = await db.insert(uploadedFiles).values({
          filename: filename || 'file',
          mimeType: mimeType || 'application/octet-stream',
          base64Data: base64Data
        }).returning();
        return res.json({ url: `/api/files/${result[0].id}` });
      }
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to upload', details: err.message, stack: err.stack });
    }
  });

router.get("/api/files/:id", async (req, res) => {
    try {
      const file = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, parseInt(req.params.id))).limit(1);
      if (file.length === 0) return res.status(404).send('Not found');
      
      const f = file[0];
      const base64Clean = (f.base64Data || '').replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Clean, 'base64');
      res.setHeader('Content-Type', f.mimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(buffer);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error retrieving file');
    }
  });

router.get('/api/preplab-cloud-files', async (req, res) => {
    const { folderId } = req.query;
    const q = `'${folderId}' in parents and trashed = false`;
    try {
       const searchRes = await drive.files.list({ q, fields: 'files(id,name,mimeType,size,createdTime,webViewLink,webContentLink)', supportsAllDrives: true, includeItemsFromAllDrives: true });
       res.json({ files: searchRes.data.files || [] });
    } catch(e) {
       console.error(e);
       res.status(500).json({error: e.message});
    }
  });

router.post('/api/preplab-cloud-upload', async (req, res) => {
    try {
      const { base64Data, mimeType, filename, folderId } = req.body;
      const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Clean, 'base64');
      
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const cleanFilename = (filename || 'uploaded_file').replace(/\.jpeg$/i, '.jpg');
      const media = { mimeType: mimeType || 'application/octet-stream', body: stream };

      // Cek apakah file dengan nama yang sama sudah ada di dalam folder tujuan (trashed = false)
      let existingFileId = null;
      let duplicateFiles = [];
      try {
        const escapedFilename = cleanFilename.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const checkQuery = `'${folderId}' in parents and name = '${escapedFilename}' and trashed = false`;
        const searchRes = await drive.files.list({
          q: checkQuery,
          fields: 'files(id, name, webViewLink, webContentLink)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        if (searchRes.data.files && searchRes.data.files.length > 0) {
          existingFileId = searchRes.data.files[0].id;
          duplicateFiles = searchRes.data.files.slice(1);
        }
      } catch (checkErr) {
        console.warn('Gagal cek file duplikat di Drive:', checkErr.message);
      }

      let response;
      let overwritten = false;

      if (existingFileId) {
        // OVERWRITE file yang sudah ada
        response = await drive.files.update({
          fileId: existingFileId,
          media: media,
          fields: 'id, name, webViewLink, webContentLink',
          supportsAllDrives: true
        });
        overwritten = true;

        // Jika sebelumnya ada file ganda berlebih, bersihkan file ganda tersebut
        for (const dup of duplicateFiles) {
          try {
            await drive.files.delete({ fileId: dup.id, supportsAllDrives: true });
          } catch (_) {}
        }
      } else {
        // Buat file baru
        const fileMetadata = { name: cleanFilename, parents: [folderId] };
        response = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id, name, webViewLink, webContentLink',
          supportsAllDrives: true
        });
      }
      
      try {
        await drive.permissions.create({
          fileId: response.data.id,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true
        });
      } catch (_) {}

      res.json({ success: true, file: response.data, overwritten });
    } catch (e) {
      console.error(e);
      res.status(500).json({error: e.message});
    }
  });

router.post('/api/preplab-cloud-create-folder', async (req, res) => {
    try {
      const { name, parentId } = req.body;
      const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      };
      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType, webViewLink',
        supportsAllDrives: true
      });
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true
      });
      res.json({ success: true, folder: response.data });
    } catch (e) {
      console.error(e);
      res.status(500).json({error: e.message});
    }
  });

router.post('/api/preplab-cloud-move-file', async (req, res) => {
    try {
      const { fileId, newParentId } = req.body;
      const file = await drive.files.get({
        fileId: fileId,
        fields: 'parents',
        supportsAllDrives: true
      });
      const previousParents = file.data.parents ? file.data.parents.join(',') : '';
      
      const response = await drive.files.update({
        fileId: fileId,
        addParents: newParentId,
        removeParents: previousParents,
        fields: 'id, parents',
        supportsAllDrives: true
      });
      res.json({ success: true, file: response.data });
    } catch (e) {
      console.error(e);
      res.status(500).json({error: e.message});
    }
  });

router.delete('/api/preplab-cloud-files/:id', async (req, res) => {
    try {
      await drive.files.update({ fileId: req.params.id, requestBody: { trashed: true }, supportsAllDrives: true });
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({error: e.message});
    }
  });

router.get('/api/preplab-cloud-logs', async (req, res) => {
    try {
      const logs = await db.select().from(preplabCloudLogs).orderBy(desc(preplabCloudLogs.timestamp)).limit(50);
      res.json(logs);
    } catch (e) {
      res.status(500).json({error: e.message});
    }
  });

router.post('/api/preplab-cloud-logs', async (req, res) => {
    try {
      await db.insert(preplabCloudLogs).values(req.body);
      res.json({success:true});
    } catch (e) {
      res.status(500).json({error: e.message});
    }
  });
