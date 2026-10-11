const { execSync } = require('child_process');
const path = require('path');

const gcloudPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
const token = execSync(`"${gcloudPath}" auth print-access-token`, { encoding: 'utf8' }).trim();
const projectId = 'project-054e3351-b8d1-42f7-9c8';
const siteId = 'project-054e3351-b8d1-42f7-9c8';
const domain = 'portal.preplabtbp.com';

async function addDomain() {
  console.log(`Menambahkan domain ${domain} ke Firebase Hosting site ${siteId}...`);
  const res = await fetch(`https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites/${siteId}/customDomains?customDomainId=${domain}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Goog-User-Project': projectId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  const data = await res.json();
  console.log('Domain result:', JSON.stringify(data, null, 2));
}

addDomain().catch(console.error);
