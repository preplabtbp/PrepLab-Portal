const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const newRoutes = `
  app.get('/api/preplab-cloud-files', async (req, res) => {
    const { folderId } = req.query;
    const q = \`'\${folderId}' in parents and trashed = false\`;
    try {
       const searchRes = await drive.files.list({ q, fields: 'files(id,name,mimeType,size,createdTime,webViewLink,webContentLink)', supportsAllDrives: true, includeItemsFromAllDrives: true });
       res.json({ files: searchRes.data.files || [] });
    } catch(e) {
       console.error(e);
       res.status(500).json({error: e.message});
    }
  });

  app.post('/api/preplab-cloud-upload', async (req, res) => {
    try {
      const { base64Data, mimeType, filename, folderId } = req.body;
      const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Clean, 'base64');
      const { Readable } = await import('stream');
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

  app.delete('/api/preplab-cloud-files/:id', async (req, res) => {
    try {
      await drive.files.delete({ fileId: req.params.id, supportsAllDrives: true });
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({error: e.message});
    }
  });

  app.get('/api/preplab-cloud-logs', async (req, res) => {
    try {
      const logs = await db.select().from(preplabCloudLogs).orderBy(desc(preplabCloudLogs.timestamp)).limit(50);
      res.json(logs);
    } catch (e) {
      res.status(500).json({error: e.message});
    }
  });

  app.post('/api/preplab-cloud-logs', async (req, res) => {
    try {
      await db.insert(preplabCloudLogs).values(req.body);
      res.json({success:true});
    } catch (e) {
      res.status(500).json({error: e.message});
    }
  });
`;

if (!code.includes('/api/preplab-cloud-files')) {
  // Insert before VITE MIDDLEWARE
  code = code.replace('// --- VITE MIDDLEWARE (Untuk Frontend) ---', newRoutes + '\n\n  // --- VITE MIDDLEWARE (Untuk Frontend) ---');
  fs.writeFileSync('server.ts', code);
}
