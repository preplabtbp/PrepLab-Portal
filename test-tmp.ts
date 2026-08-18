import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function run() {
  const formData = new FormData();
  fs.writeFileSync('test.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  formData.append('file', fs.createReadStream('test.png'));
  
  const res = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    body: formData
  });
  const json = await res.json();
  console.log(json);
  
  // URL to download is json.data.url, but we need the direct image link
  // tmpfiles.org returns https://tmpfiles.org/1234/test.png
  // Direct link is https://tmpfiles.org/dl/1234/test.png
}
run();
