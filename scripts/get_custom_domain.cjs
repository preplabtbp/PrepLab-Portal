const { execSync } = require('child_process');
const path = require('path');

const gcloudPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
const token = execSync(`"${gcloudPath}" auth print-access-token`, { encoding: 'utf8' }).trim();
const projectId = 'project-054e3351-b8d1-42f7-9c8';
const siteId = 'project-054e3351-b8d1-42f7-9c8';
const domain = 'portal.preplabtbp.com';

async function getCustomDomain() {
  const res = await fetch(`https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites/${siteId}/customDomains/${domain}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Goog-User-Project': projectId
    }
  });
  const data = await res.json();
  console.log('Custom Domain Status:', JSON.stringify(data, null, 2));
}

getCustomDomain().catch(console.error);
