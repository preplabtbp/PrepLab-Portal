const { execSync } = require('child_process');
const path = require('path');

const gcloudPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd');
const token = execSync(`"${gcloudPath}" auth print-access-token`, { encoding: 'utf8' }).trim();
const projectId = 'project-054e3351-b8d1-42f7-9c8';

console.log('Deploying Firebase Hosting rewrite config...');
try {
  const out = execSync(`npx --yes firebase-tools deploy --only hosting --project ${projectId}`, {
    env: { ...process.env, GOOGLE_OAUTH_ACCESS_TOKEN: token },
    encoding: 'utf8'
  });
  console.log(out);
} catch (err) {
  if (err.stdout) console.log(err.stdout);
  if (err.stderr) console.error(err.stderr);
  process.exit(1);
}
