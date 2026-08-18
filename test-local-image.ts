import { drive, docs } from './google-services.ts';
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';

const app = express();
const port = 3005;

app.get('/api/images/:id', async (req, res) => {
  const fileId = req.params.id;
  try {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    res.setHeader('Content-Type', 'image/png');
    response.data.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching image');
  }
});

const server = app.listen(port, '0.0.0.0', async () => {
  console.log(`Server listening on port ${port}`);
  
  try {
      const docId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI'; // TBP
      const folderId = '1EbAb6E54BxU52K-lJ1uTS9lwd8l3p8m3';
      
      const response = await drive.files.create({
        requestBody: { name: 'test.png', parents: [folderId] },
        media: { mimeType: 'image/png', body: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' },
        fields: 'id',
        supportsAllDrives: true
      });
      const fileId = response.data.id;
      
      const copyResponse = await drive.files.copy({
        fileId: docId,
        supportsAllDrives: true,
        requestBody: { name: `Temp_test_img2` },
      });
      const tempDocId = copyResponse.data.id;
      
      // Wait, we need an ngrok or public URL to test.
      // But in our environment, we don't have public URL for port 3005.
      // ONLY port 3000 is exposed!
  } finally {
      server.close();
  }
});
