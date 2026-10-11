const { execSync } = require('child_process');
const path = require('path');

const gcloudPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
const args = process.argv.slice(2).join(' ');
const cmd = `"${gcloudPath}" ${args}`;

try {
  const output = execSync(cmd, { encoding: 'utf8', env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  console.log(output);
} catch (err) {
  if (err.stdout) console.log(err.stdout);
  if (err.stderr) console.error(err.stderr);
  process.exit(err.status || 1);
}
