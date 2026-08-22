import { db } from '../src/db/index.js';
import { bulletinPosts } from '../src/db/schema.js';
import { Client } from '@notionhq/client';
import fs from 'fs';
import path from 'path';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  const posts = await db.select().from(bulletinPosts);
  let totalS3Links = 0;
  const postsWithS3 = [];

  for (const p of posts) {
    if (p.content && p.content.includes('prod-files-secure.s3')) {
      const regex = /\[([^\]]+)\]\((https:\/\/prod-files-secure\.s3[^\)]+)\)/g;
      let match;
      const files = [];
      while ((match = regex.exec(p.content)) !== null) {
        files.push({ fileName: match[1], url: match[2] });
      }
      if (files.length > 0) {
        totalS3Links += files.length;
        postsWithS3.push({ id: p.id, title: p.title, notionId: p.notionId, files });
      }
    }
  }

  console.log(`Found ${postsWithS3.length} posts containing ${totalS3Links} Notion S3 file links.`);
  for (const item of postsWithS3) {
    console.log(`\n- Post ${item.id}: "${item.title}" (notionId: ${item.notionId})`);
    for (const f of item.files) {
      console.log(`    File: "${f.fileName}"`);
    }
  }
  process.exit(0);
}

main().catch(console.error);
