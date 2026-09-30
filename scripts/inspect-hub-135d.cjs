const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

async function check() {
  const pageId = '135d00c5-c809-8104-b907-d6292b374b73';
  const page = await notion.pages.retrieve({ page_id: pageId });
  console.log('Page:', page.url);
  console.log('Title:', JSON.stringify(page.properties));
  console.log('Parent:', page.parent);

  const mdblocks = await n2m.pageToMarkdown(pageId);
  const md = n2m.toMarkdownString(mdblocks);
  console.log('Markdown length:', md.parent.length);
  console.log('Markdown sample:\n', md.parent.slice(0, 1000));
}

check().catch(console.error);
