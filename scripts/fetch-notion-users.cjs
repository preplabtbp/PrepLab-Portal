const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  try {
    const users = await notion.users.list({});
    console.log('Notion Users:', users.results.map(u => ({
      id: u.id,
      name: u.name,
      type: u.type,
      avatar_url: u.avatar_url,
      email: u.person?.email
    })));
  } catch (e) {
    console.error('Error fetching users:', e.message);
  }
}

main().catch(console.error);
