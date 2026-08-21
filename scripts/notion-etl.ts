import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import fetch from 'node-fetch';

// TODO: Set these environment variables or replace with actual values
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASES = [
    { id: '128d00c5c809802fa74ef390708c9afe', pt: 'TBP' },
    { id: '135d00c5c809804185f5eb3f09667469', pt: 'GTS' }
];
const PORTAL_API_URL = process.env.PORTAL_API_URL || 'http://localhost:3000/api/bulletin/migrate-notion';

const notion = new Client({ auth: NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

async function getPtForPage(page: any): Promise<string> {
    const parent = page.parent;
    if (parent && parent.type === 'workspace') return 'TBP';
    if (parent && parent.type === 'page_id') {
        if (parent.page_id.replace(/-/g, '') === '135d00c5c809804185f5eb3f09667469') return 'GTS';
        if (parent.page_id.replace(/-/g, '') === '128d00c5c809802fa74ef390708c9afe') return 'TBP';
    }
    if (parent && parent.type === 'block_id') {
        // try to determine from block ID (not reliable without extra queries)
    }
    return 'TBP'; // Default
}

async function migrateNotionToPortal() {
    console.log("Starting Notion Migration...");
    try {
        console.log(`\nFetching all pages from Notion workspace...`);
        const response = await notion.search({
            filter: { property: 'object', value: 'page' },
        });

        console.log(`Found ${response.results.length} pages. Executing ETL...`);

        for (const page of response.results) {
            const notionId = page.id;
            const props = (page as any).properties;

            // Mapping Fields
            let title = "Untitled";
            if (props) {
                for (const key in props) {
                    if (props[key].type === 'title') {
                        title = props[key].title[0]?.plain_text || "Untitled";
                    }
                }
            }
            // Skip the Homepages themselves
            if (notionId.replace(/-/g, '') === '135d00c5c809804185f5eb3f09667469' || 
                notionId.replace(/-/g, '') === '128d00c5c809802fa74ef390708c9afe') {
                continue;
            }

            const department = "Prep & Lab";
            const category = "INFO::1";
            const tags: string[] = [];
            
            let coverImage = null;
            if ((page as any).cover) {
                const cover = (page as any).cover;
                coverImage = cover.type === 'external' ? cover.external.url : cover.file.url;
            }

            const pt = await getPtForPage(page);

            console.log(`Processing: ${title} (${notionId}) [PT: ${pt}]`);

            // Extract content and transform to Markdown
            const mdblocks = await n2m.pageToMarkdown(notionId);
            let mdString = n2m.toMarkdownString(mdblocks);
            let contentStr = mdString.parent || '';

            // Handle empty pages
            if (!contentStr.trim()) {
                contentStr = '*No additional content*';
            }

            // Load to Portal
            const payload = {
                title,
                notionId,
                department,
                category,
                tags,
                coverImage,
                content: contentStr,
                originalCreatedAt: (page as any).created_time,
                authorNik: 'SYSTEM',
                authorName: 'Notion Import',
                pt: pt
            };

            const res = await fetch(PORTAL_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (res.ok) {
                console.log(`✅ Success: ${title}`);
            } else {
                console.error(`❌ Failed: ${title} -`, result);
            }
        }
        console.log("\nMigration completed.");
    } catch (e) {
        console.error("Migration error:", e);
    }
}

migrateNotionToPortal();
