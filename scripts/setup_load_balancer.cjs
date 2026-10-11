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
    // Ignore already exists error
    if (err.stderr && err.stderr.includes('already exists')) {
      console.log('Resource sudah ada, lanjut...');
      return '';
    }
    throw err;
  }
}

async function main() {
  console.log('=== MEMULAI SETUP LOAD BALANCER ASIA-SOUTHEAST2 UNTUK PORTAL.PREPLABTBP.COM ===');

  // 1. URL Map
  run('compute url-maps create preplab-portal-url-map --default-service=preplab-portal-backend');

  // 2. Reserve Global Static IP
  run('compute addresses create preplab-portal-ip --network-tier=PREMIUM --ip-version=IPV4 --global');

  // 3. SSL Certificate for portal.preplabtbp.com
  run('compute ssl-certificates create preplab-portal-cert --domains=portal.preplabtbp.com --global');

  // 4. Target HTTPS Proxy
  run('compute target-https-proxies create preplab-portal-https-proxy --ssl-certificates=preplab-portal-cert --url-map=preplab-portal-url-map');

  // 5. Forwarding Rule (Port 443)
  run('compute forwarding-rules create preplab-portal-https-forwarding-rule --load-balancing-scheme=EXTERNAL_MANAGED --network-tier=PREMIUM --address=preplab-portal-ip --target-https-proxy=preplab-portal-https-proxy --global --ports=443');

  // 6. Dapatkan Static IP
  const ip = run('compute addresses describe preplab-portal-ip --global --format="value(address)"');
  console.log('\n============================================================');
  console.log(`STATIC IP BERHASIL DIALOKASIKAN: ${ip.trim()}`);
  console.log('============================================================');
}

main().catch(err => {
  console.error('Setup gagal:', err.message);
  process.exit(1);
});
