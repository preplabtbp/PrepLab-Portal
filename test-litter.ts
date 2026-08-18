import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function run() {
  const formData = new FormData();
  fs.writeFileSync('test.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  formData.append('reqtype', 'fileupload');
  formData.append('time', '1h');
  formData.append('fileToUpload', fs.createReadStream('test.png'));
  
  const res = await fetch('https://litterbox.catbox.moe/user/api.php', {
    method: 'POST',
    body: formData
  });
  const text = await res.text();
  console.log("Litterbox URL:", text);
}
run();
