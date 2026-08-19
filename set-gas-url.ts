import { db } from './src/db/index.js';
import { appSettings } from './src/db/schema.js';

async function setGasUrl() {
  const newUrl = 'https://script.google.com/macros/s/AKfycbw2uP269SFZz1NnrKnWpTqrhKna-jCkzNFne_H5dBa3QXpbUHz_7y7rgmsXM4xv3QsD/exec';
  try {
    await db.insert(appSettings)
      .values({ settingKey: 'GAS_WEB_APP_URL', settingValue: newUrl, description: 'Google Apps Script Webhook URL' })
      .onConflictDoUpdate({ target: appSettings.settingKey, set: { settingValue: newUrl } });
    console.log("Successfully updated GAS_WEB_APP_URL in database.");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
setGasUrl();
