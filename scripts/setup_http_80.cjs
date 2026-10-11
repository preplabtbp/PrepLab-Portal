const { execSync } = require('child_process');
const path = require('path');
const gcloudPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');

function run(cmdStr) {
  const fullCmd = `"${gcloudPath}" ${cmdStr}`;
  console.log(`\n>>> Menjalankan: gcloud ${cmdStr}`);
  try {
    const out = execSync(fullCmd, { encoding: 'utf8', env: process.env });
    if (out.trim()) console.log(out.trim());
    return out;
  } catch (err) {
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    if (err.stderr && err.stderr.includes('already exists')) {
      console.log('Resource sudah ada, lanjut...');
      return '';
    }
  }
}

async function main() {
  console.log('=== MENAMBAHKAN PORT 80 HTTP PROXY ===');
  run('compute target-http-proxies create preplab-portal-http-proxy --url-map=preplab-portal-url-map');
  run('compute forwarding-rules create preplab-portal-http-forwarding-rule --load-balancing-scheme=EXTERNAL_MANAGED --network-tier=PREMIUM --address=preplab-portal-ip --target-http-proxy=preplab-portal-http-proxy --global --ports=80');
  console.log('Port 80 HTTP Forwarding Rule selesai!');
}

main();
