const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target1 = `import { generatePdfFromTemplate, getAuthClient } from './google-services.js';\nimport { google } from 'googleapis';`;
const replace1 = `import { generatePdfFromTemplate, drive } from './google-services.js';`;
if (code.includes(target1)) {
    code = code.replace(target1, replace1);
    console.log("Reverted imports");
}

const target2 = `      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No Access Token' });
      }
      const accessToken = authHeader.split(' ')[1];
      
      const data = req.body;`;
const replace2 = `      const data = req.body;`;
if (code.includes(target2)) {
    code = code.replace(target2, replace2);
    console.log("Reverted auth check");
}

const target3 = `      // Upload images temporarily to Google Drive
      const uploadBase64 = async (b64, name) => {
        if (!b64) return null;
        try {
          const auth = getAuthClient(accessToken);
          const drive = google.drive({ version: 'v3', auth });
          
          const base64Clean = b64.replace(/^data:.*?;base64,/, "");
          const buffer = Buffer.from(base64Clean, 'base64');
          const { Readable } = await import('stream');
          const stream = new Readable();
          stream.push(buffer);
          stream.push(null);
          
          const fileRes = await drive.files.create({
            requestBody: { name: \`temp_\${name}\` },
            media: { mimeType: 'image/png', body: stream },
            fields: 'id'
          });`;
const replace3 = `      // Upload images temporarily to Google Drive
      const uploadBase64 = async (b64, name) => {
        if (!b64) return null;
        try {
          const base64Clean = b64.replace(/^data:.*?;base64,/, "");
          const buffer = Buffer.from(base64Clean, 'base64');
          const { Readable } = await import('stream');
          const stream = new Readable();
          stream.push(buffer);
          stream.push(null);
          
          const fileRes = await drive.files.create({
            requestBody: { name: \`temp_\${name}\` },
            media: { mimeType: 'image/png', body: stream },
            fields: 'id'
          });`;
if (code.includes(target3)) {
    code = code.replace(target3, replace3);
    console.log("Reverted uploadBase64");
}

const target4 = `      // Generate PDF
      const pdfResult = await generatePdfFromTemplate(accessToken, templateId, folderId, replacements, namaBaru, images);
      
      // Cleanup temporary images from Google Drive
      const cleanupIds = [fotoA?.id, fotoB?.id, fotoDok?.id].filter(Boolean);
      for (const id of cleanupIds) {
          try {
              const auth = getAuthClient(accessToken);
              const drive = google.drive({ version: 'v3', auth });
              await drive.files.delete({ fileId: id });
          } catch(e) {
              console.error("Failed to delete temp image:", id);
          }
      }`;
const replace4 = `      // Generate PDF
      const pdfResult = await generatePdfFromTemplate(templateId, folderId, replacements, namaBaru, images);
      
      // Cleanup temporary images from Google Drive
      const cleanupIds = [fotoA?.id, fotoB?.id, fotoDok?.id].filter(Boolean);
      for (const id of cleanupIds) {
          try {
              await drive.files.delete({ fileId: id });
          } catch(e) {
              console.error("Failed to delete temp image:", id);
          }
      }`;
if (code.includes(target4)) {
    code = code.replace(target4, replace4);
    console.log("Reverted generatePdfFromTemplate and cleanup");
}

fs.writeFileSync('server.ts', code);
