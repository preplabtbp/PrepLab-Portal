const { execSync } = require('child_process');
const path = require('path');

const gcloudPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
const token = execSync(`"${gcloudPath}" auth print-access-token`, { encoding: 'utf8' }).trim();
const projectId = 'project-054e3351-b8d1-42f7-9c8';

async function setup() {
  console.log('1. Menghubungkan Firebase ke project GCP...');
  const addRes = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${projectId}:addFirebase`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Goog-User-Project': projectId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  const addData = await addRes.json();
  console.log('addFirebase response:', JSON.stringify(addData, null, 2));

  console.log('\n2. Mengambil daftar site Firebase Hosting...');
  const sitesRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Goog-User-Project': projectId
    }
  });
  const sitesData = await sitesRes.json();
  console.log('Sites:', JSON.stringify(sitesData, null, 2));
}

setup().catch(console.error);
