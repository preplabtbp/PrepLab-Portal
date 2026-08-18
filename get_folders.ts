import { config } from 'dotenv';
config();
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const auth = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET
);
auth.setCredentials({
  refresh_token: REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth });

async function run() {
  const res = await drive.files.list({
    q: "'1H9y-VQr43SAWjinG8TXm2SIPPjubcrd1' in parents",
    fields: 'files(id, name, mimeType)',
  });
  console.log(res.data.files);
}
run().catch(console.error);
