import { db } from '../src/db/index';
import { appSettings } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function syncMedia() {
  const desiredMedia = {
    banner: '/images/dashboard/prep_lab_banner.jpg',
    gallery_1: '/images/dashboard/gallery_1.jpg',
    gallery_2: '/images/dashboard/gallery_2.jpg',
    gallery_3: '/images/dashboard/gallery_3.jpg',
    gallery_4: '/images/dashboard/gallery_4.jpg',
    lofi: '/images/dashboard/lofi_girl.jpg',
    gallery_1_label: '🔬 Analytical Lab',
    gallery_2_label: '⛏ Mining & Prep',
    gallery_3_label: '⚙ Maintenance Unit',
    gallery_4_label: '📋 QA/QC Center',
    hide_gallery_labels: false
  };

  const settingValue = JSON.stringify(desiredMedia);

  const existing = await db.select().from(appSettings).where(eq(appSettings.settingKey, 'bulletin_dashboard_media'));
  if (existing.length > 0) {
    await db.update(appSettings)
      .set({
        settingValue,
        description: 'Custom Bulletin Homepage Canvases & Wallpapers',
        updatedAt: new Date()
      })
      .where(eq(appSettings.settingKey, 'bulletin_dashboard_media'));
    console.log('Successfully updated bulletin_dashboard_media in DB.');
  } else {
    await db.insert(appSettings).values({
      settingKey: 'bulletin_dashboard_media',
      settingValue,
      description: 'Custom Bulletin Homepage Canvases & Wallpapers'
    });
    console.log('Successfully inserted bulletin_dashboard_media in DB.');
  }

  process.exit(0);
}

syncMedia().catch(err => {
  console.error(err);
  process.exit(1);
});
