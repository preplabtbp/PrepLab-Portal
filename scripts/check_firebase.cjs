const { execSync } = require('child_process');
const path = require('path');

const gcloudPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
const token = execSync(`"${gcloudPath}" auth print-access-token`, { encoding: 'utf8' }).trim();
const projectId = 'project-054e3351-b8d1-42f7-9c8';

async function check() {
  const res = await fetch(`https://firebase.googleapis.com/v1beta1/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Goog-User-Project': projectId
    }
  });
  const data = await res.json();
  console.log('Firebase project status:', JSON.stringify(data, null, 2));
}

check().catch(console.error);
