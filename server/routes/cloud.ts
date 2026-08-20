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
      const fileMetadata = {
        name: filename || 'uploaded_file',
        parents: [finalFolderId]
      };
      const media = {
        mimeType: mimeType || 'application/octet-stream',
        body: stream
      };
      
      try {
        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id, webViewLink, webContentLink',
          supportsAllDrives: true // Wajib untuk Shared Drives
        });

        const fileId = response.data.id;

        // 5. Ubah permission file agar bisa diakses publik (Anyone with the link can view)
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
          supportsAllDrives: true
        });

        // Direct link format for image tags
        const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        
        res.json({ url: directUrl, fileId: fileId });
      } catch (driveErr) {
        console.error('Drive upload error, falling back to db:', driveErr.message);
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
      const buffer = Buffer.from(f.base64Data, 'base64');
      res.setHeader('Content-Type', f.mimeType);
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

      const fileMetadata = { name: filename, parents: [folderId] };
      const media = { mimeType: mimeType || 'application/octet-stream', body: stream };
      
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true
      });
      
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true
      });

      res.json({ success: true, file: response.data });
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
