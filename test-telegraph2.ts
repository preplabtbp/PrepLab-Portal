import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function run() {
  const formData = new FormData();
  fs.writeFileSync('test.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  formData.append('file', fs.createReadStream('test.png'));
  
  try {
      const res = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: formData,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      const json = await res.json();
      console.log("Telegraph:", json);
  } catch(e) {
      console.error(e.message);
  }
}
run();
