import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renderHdChangelog() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log(`Using browser executable: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  
  // Set viewport to 1000px with deviceScaleFactor = 3 (Retina 3x = 3000px width Ultra HD)
  await page.setViewport({
    width: 960,
    height: 2200,
    deviceScaleFactor: 3
  });

  const htmlPath = path.resolve(__dirname, 'changelog-renderer.html');
  const fileUrl = `file://${htmlPath.replace(/\\/g, '/')}`;

  console.log(`Loading HTML: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');

  // Small delay for smooth rendering
  await new Promise(r => setTimeout(r, 800));

  const targetContainer = await page.$('.document-container');
  const outputPath = path.resolve(__dirname, '..', 'public', 'preplab_changelog_v2.6.0.png');
  const publicChangelogPath = path.resolve(__dirname, '..', 'public', 'changelog.png');
  const artifactPath = path.resolve('C:\\Users\\Muhammad Naufalsar\\.gemini\\antigravity-ide\\brain\\704c25b8-3edf-4168-8226-6b6a7ece4285\\preplab_changelog_hd_v2.6.0.png');

  if (targetContainer) {
    await targetContainer.screenshot({ path: outputPath, type: 'png' });
    fs.copyFileSync(outputPath, publicChangelogPath);
    try {
      fs.copyFileSync(outputPath, artifactPath);
    } catch (e) {}
    console.log(`✅ Ultra HD Screenshot captured to: ${outputPath}`);
  } else {
    await page.screenshot({ path: outputPath, fullPage: true, type: 'png' });
    fs.copyFileSync(outputPath, publicChangelogPath);
    console.log(`✅ Ultra HD Full Page Screenshot captured to: ${outputPath}`);
  }

  await browser.close();
}

renderHdChangelog().catch(err => {
  console.error('Error rendering HD changelog:', err);
  process.exit(1);
});
