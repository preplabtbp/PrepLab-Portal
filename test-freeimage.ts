import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function run() {
  const formData = new FormData();
  fs.writeFileSync('test.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  formData.append('key', '6d207e02198a847aa98d0a2a901485a5');
  formData.append('action', 'upload');
  formData.append('source', fs.createReadStream('test.png'));
  
  try {
      const res = await fetch('https://freeimage.host/api/1/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      console.log("FreeImage:", json);
  } catch(e) {
      console.error(e.message);
  }
}
run();
