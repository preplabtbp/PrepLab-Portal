import { docs, drive } from './google-services.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const docId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI'; // TBP
  const copyResponse = await drive.files.copy({
    fileId: docId,
    supportsAllDrives: true,
    requestBody: { name: `Temp_test_img` },
  });
  const tempDocId = copyResponse.data.id;
  
  const finalUrl = 'https://iili.io/CgLO5Mb.png';
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
      console.log("Success with", finalUrl);
  } catch (err) {
      console.log("Error:", err.message);
  }
}
run();
