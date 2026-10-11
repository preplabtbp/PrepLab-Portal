const { execSync } = require('child_process');
const path = require('path');

const gcloudPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');

function run(cmdStr) {
  const fullCmd = `"${gcloudPath}" ${cmdStr}`;
  console.log(`Menghapus: gcloud ${cmdStr}`);
  try {
    const out = execSync(fullCmd, { encoding: 'utf8', env: process.env });
    if (out.trim()) console.log(out.trim());
  } catch (err) {
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
  }
}

async function cleanup() {
  console.log('=== MEMBERSIHKAN RESOURCE LOAD BALANCER AGAR TIDAK ADA BIAYA ===');
  run('compute forwarding-rules delete preplab-portal-https-forwarding-rule --global --quiet');
  run('compute forwarding-rules delete preplab-portal-http-forwarding-rule --global --quiet');
  run('compute target-https-proxies delete preplab-portal-https-proxy --quiet');
  run('compute target-http-proxies delete preplab-portal-http-proxy --quiet');
  run('compute ssl-certificates delete preplab-portal-cert --quiet');
  run('compute url-maps delete preplab-portal-url-map --quiet');
  run('compute backend-services delete preplab-portal-backend --global --quiet');
  run('compute network-endpoint-groups delete preplab-portal-neg --region asia-southeast2 --quiet');
  run('compute addresses delete preplab-portal-ip --global --quiet');
  console.log('=== SEMUA RESOURCE LOAD BALANCER BERHASIL DIBERSIHKAN! ===');
}

cleanup();
