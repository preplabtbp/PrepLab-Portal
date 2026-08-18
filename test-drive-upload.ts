import { drive, docs, generatePdfFromTemplate } from './google-services.ts';
import { Readable } from 'stream';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(b64, 'base64');
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  
  try {
      const res = await drive.files.create({
        requestBody: {
          name: 'temp_test.png',
        },
        media: {
          mimeType: 'image/png',
          body: stream
        },
        fields: 'id, webViewLink'
      });
      
      const fileId = res.data.id;
      console.log("File uploaded, id:", fileId);
      
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        }
      });
      console.log("Permission granted");
      
      const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
      console.log("URL:", url);
      
      const docId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI';
      const folderId = '1EbAb6E54BxU52K-lJ1uTS9lwd8l3p8m3';
      const replacements = { '<<Nama Peserta>>': 'Budi Test IMGTAG' };
      const images = { '<<FOTOA>>': url };
      
      const pdfRes = await generatePdfFromTemplate(docId, folderId, replacements, "Test_Drive_IMGTAG_Output", images);
      console.log("PDF Success:", pdfRes);
      
      // Cleanup
      await drive.files.delete({ fileId: fileId });
      console.log("Cleanup done");
  } catch(e) {
      console.error(e.message);
  }
}
run();
