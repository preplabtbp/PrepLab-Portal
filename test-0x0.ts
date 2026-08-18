import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function run() {
  const formData = new FormData();
  fs.writeFileSync('test.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  formData.append('file', fs.createReadStream('test.png'));
  
  const res = await fetch('https://0x0.st', {
    method: 'POST',
    body: formData
  });
  const text = await res.text();
  console.log("0x0 URL:", text);
}
run();
