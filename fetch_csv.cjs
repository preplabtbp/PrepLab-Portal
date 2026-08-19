const fs = require('fs');
const https = require('https');

const file = fs.createWriteStream("rekap.csv");
https.get("https://docs.google.com/spreadsheets/d/1wk0bXvmbZHZOjTTGDy-5oQrFZJmFjJ1c/export?format=csv&gid=1747367630", response => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    const data = fs.readFileSync('rekap.csv', 'utf8');
    console.log(data.split('\n').slice(0, 5).join('\n'));
  });
});
