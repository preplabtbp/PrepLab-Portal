const { execSync } = require('child_process');
const path = require('path');

const gcloudPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
const token = execSync(`"${gcloudPath}" auth print-access-token`, { encoding: 'utf8' }).trim();
const projectId = 'project-054e3351-b8d1-42f7-9c8';
const siteId = 'project-054e3351-b8d1-42f7-9c8';

async function deploy() {
  console.log('1. Membuat version Firebase Hosting baru dengan Cloud Run rewrite ke asia-southeast2...');
  const createVersionRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites/${siteId}/versions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Goog-User-Project': projectId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      config: {
        rewrites: [
          {
            glob: '**',
            run: {
              serviceId: 'preplab-portal',
              region: 'asia-southeast2'
            }
          }
        ]
      }
    })
  });
  const versionData = await createVersionRes.json();
  console.log('Version created:', JSON.stringify(versionData, null, 2));

  if (!versionData.name) {
    throw new Error('Gagal membuat versi: ' + JSON.stringify(versionData));
  }

  const versionName = versionData.name;

  console.log('\n2. Mengubah status version menjadi FINALIZED...');
  const finalizeRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/${versionName}?updateMask=status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Goog-User-Project': projectId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'FINALIZED'
    })
  });
  const finalizeData = await finalizeRes.json();
  console.log('Finalized:', JSON.stringify(finalizeData, null, 2));

  console.log('\n3. Merilis versi ke Live...');
  const releaseRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/projects/${projectId}/sites/${siteId}/releases?versionName=${encodeURIComponent(versionName)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Goog-User-Project': projectId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  const releaseData = await releaseRes.json();
  console.log('Release created:', JSON.stringify(releaseData, null, 2));

  console.log('\n============================================================');
  console.log('FIREBASE HOSTING REWRITE BERHASIL DIDEPLOY KE LIVE!');
  console.log('URL: https://project-054e3351-b8d1-42f7-9c8.web.app');
  console.log('============================================================');
}

deploy().catch(err => {
  console.error('Deploy error:', err);
  process.exit(1);
});
