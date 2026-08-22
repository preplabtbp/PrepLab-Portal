import { db } from '../src/db/index.js';
import { bulletinPosts } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'notion');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
}

async function downloadFile(url: string, destPath: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Failed to fetch ${url}: status ${res.status}`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (err: any) {
    console.error(`Error downloading file to ${destPath}:`, err.message);
    return false;
  }
}

async function getAllBlocksRecursive(blockId: string): Promise<any[]> {
  const allBlocks: any[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    try {
      const res: any = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      });
      for (const b of res.results) {
        allBlocks.push(b);
        if (b.has_children && (b.type === 'column_list' || b.type === 'column' || b.type === 'toggle')) {
          const childBlocks = await getAllBlocksRecursive(b.id);
          allBlocks.push(...childBlocks);
        }
      }
      hasMore = res.has_more;
      cursor = res.next_cursor;
    } catch (err: any) {
      console.warn(`Error fetching children for ${blockId}:`, err.message);
      break;
    }
  }
  return allBlocks;
}

async function main() {
  console.log('Starting Notion files backup & permanent caching...');
  const posts = await db.select().from(bulletinPosts);
  console.log(`Found ${posts.length} posts in database.`);

  let totalDownloaded = 0;
  let totalPostsUpdated = 0;

  for (const post of posts) {
    if (!post.notionId) continue;
    if (!post.content || !post.content.includes('prod-files-secure.s3')) continue;

    console.log(`\nProcessing Post ${post.id}: "${post.title}" (notionId: ${post.notionId})`);
    const blocks = await getAllBlocksRecursive(post.notionId);
    let updatedContent = post.content;
    let postChanged = false;

    for (const b of blocks) {
      let fileUrl = '';
      let fileName = '';

      if (b.type === 'file' && b.file?.file?.url) {
        fileUrl = b.file.file.url;
        fileName = b.file.name || 'document.pdf';
      } else if (b.type === 'image' && b.image?.file?.url) {
        fileUrl = b.image.file.url;
        fileName = 'image.png';
      } else if (b.type === 'pdf' && b.pdf?.file?.url) {
        fileUrl = b.pdf.file.url;
        fileName = 'document.pdf';
      }

      if (fileUrl) {
        // Extract S3 path key to identify which link in content matches this block
        const s3PathMatch = fileUrl.match(/prod-files-secure\.s3[^\/]+\/([a-f0-9-]+)\/([a-f0-9-]+)\/([^?]+)/);
        const uniqueFileId = s3PathMatch ? s3PathMatch[2] : b.id;
        const cleanName = sanitizeFilename(`${uniqueFileId}_${fileName}`);
        const localFilePath = path.join(UPLOAD_DIR, cleanName);
        const publicUrl = `/uploads/notion/${cleanName}`;

        if (!fs.existsSync(localFilePath)) {
          console.log(`  Downloading "${fileName}" -> ${cleanName}...`);
          const ok = await downloadFile(fileUrl, localFilePath);
          if (ok) {
            totalDownloaded++;
            console.log(`  ✓ Saved: ${cleanName} (${fs.statSync(localFilePath).size} bytes)`);
          }
        } else {
          console.log(`  ✓ Already exists locally: ${cleanName}`);
        }

        // Replace expired / temporary S3 URL in markdown with local public URL
        // Match any link that has the uniqueFileId or similar pattern
        if (s3PathMatch) {
          const s3Key = `${s3PathMatch[1]}/${s3PathMatch[2]}`;
          // Replace matching URLs in markdown
          const regex = new RegExp(`https:\\/\\/prod-files-secure\\.s3[^\\)]*${s3PathMatch[2]}[^\\)]*`, 'g');
          if (regex.test(updatedContent)) {
            updatedContent = updatedContent.replace(regex, publicUrl);
            postChanged = true;
          }
        }
      }
    }

    if (postChanged && updatedContent !== post.content) {
      await db.update(bulletinPosts)
        .set({ content: updatedContent })
        .where(eq(bulletinPosts.id, post.id));
      totalPostsUpdated++;
      console.log(`  🎉 Updated Post ${post.id} markdown with permanent local file links.`);
    }
  }

  console.log(`\n==============================================`);
  console.log(`Finished! Downloaded ${totalDownloaded} files. Updated ${totalPostsUpdated} posts with permanent links.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
