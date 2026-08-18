import { syncRosterData } from './src/syncRoster.js';
async function run() {
  console.log("Running sync on PROD...");
  try {
    await syncRosterData();
    console.log("Sync done.");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
