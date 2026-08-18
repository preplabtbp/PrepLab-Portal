import { drive, docs } from './google-services.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const docId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI'; // TBP
  const folderId = '1EbAb6E54BxU52K-lJ1uTS9lwd8l3p8m3';
  
  // Create an image
  const response = await drive.files.create({
    requestBody: { name: 'test.png', parents: [folderId] },
    media: { mimeType: 'image/png', body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' },
    fields: 'id, webViewLink',
    supportsAllDrives: true
  });
  const fileId = response.data.id;
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true
  });
  
  console.log("Image ID:", fileId);
  const finalUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  
  const copyResponse = await drive.files.copy({
    fileId: docId,
    supportsAllDrives: true,
    requestBody: { name: `Temp_test_img` },
  });
  const tempDocId = copyResponse.data.id;
  console.log("Doc ID:", tempDocId);
  
  try {
      await docs.documents.batchUpdate({
        documentId: tempDocId,
        requestBody: {
          requests: [{
             insertInlineImage: {
                uri: finalUrl,
                location: { index: 1 },
                objectSize: { width: { magnitude: 200, unit: 'PT' } }
             }
          }]
        }
      });
      console.log("Success with thumbnail");
  } catch (err) {
      console.log("Error:", err.message);
  }
}
run();
