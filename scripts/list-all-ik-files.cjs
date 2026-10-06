const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PAGE_ID = '12bd00c5-c809-8057-8957-f015eec446ea';

async function listAll() {
  const blocks = await notion.blocks.children.list({ block_id: PAGE_ID, page_size: 100 });
  console.log(`Total blocks on page: ${blocks.results.length}`);
  
  const ikList = [];

  for (const b of blocks.results) {
    if (b.type === 'toggle') {
      const toggleText = b.toggle.rich_text?.map(t => t.plain_text).join('').trim() || '';
      console.log(`\nToggle: "${toggleText}" (${b.id})`);
      
      // Get children inside toggle
      const children = await notion.blocks.children.list({ block_id: b.id, page_size: 100 });
      for (const child of children.results) {
        if (child.type === 'file') {
          const fileObj = child.file.file || child.file.external;
          const fileName = child.file.name || 'document.pdf';
          const fileUrl = fileObj?.url;
          console.log(`  -> File: ${fileName} | URL: ${fileUrl ? fileUrl.substring(0, 100) : 'none'}`);
          ikList.push({
            toggleTitle: toggleText,
            toggleId: b.id,
            fileBlockId: child.id,
            fileName: fileName,
            fileUrl: fileUrl
          });
        } else if (child.type === 'pdf') {
          const pdfObj = child.pdf.file || child.pdf.external;
          const fileName = toggleText.endsWith('.pdf') ? toggleText : `${toggleText}.pdf`;
          const fileUrl = pdfObj?.url;
          console.log(`  -> PDF block: ${fileName} | URL: ${fileUrl ? fileUrl.substring(0, 100) : 'none'}`);
          ikList.push({
            toggleTitle: toggleText,
            toggleId: b.id,
            fileBlockId: child.id,
            fileName: fileName,
            fileUrl: fileUrl
          });
        } else {
          console.log(`  -> Other child type: ${child.type}`);
        }
      }
    } else if (b.type === 'file') {
      const fileObj = b.file.file || b.file.external;
      const fileName = b.file.name || 'document.pdf';
      console.log(`Top-level file: ${fileName}`);
      ikList.push({
        toggleTitle: fileName.replace(/\.pdf$/i, ''),
        toggleId: b.id,
        fileBlockId: b.id,
        fileName: fileName,
        fileUrl: fileObj?.url
      });
    }
  }

  console.log(`\n=== Total IK Files found: ${ikList.length} ===`);
  console.table(ikList.map((item, idx) => ({
    No: idx + 1,
    Toggle: item.toggleTitle,
    FileName: item.fileName,
    HasUrl: Boolean(item.fileUrl)
  })));
}

listAll().catch(console.error);
