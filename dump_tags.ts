import { docs } from './google-services.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const docId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI';
  const docRes = await docs.documents.get({ documentId: docId });
  const content = docRes.data.body?.content || [];
  
  const tags = [];
  const searchElements = (elements) => {
    for (const el of elements) {
      if (el.paragraph) {
        for (const pEl of el.paragraph.elements) {
          if (pEl.textRun && pEl.textRun.content) {
            tags.push(pEl.textRun.content);
          }
        }
      } else if (el.table) {
        for (const row of el.table.tableRows) {
          for (const cell of row.tableCells) {
            if (cell.content) searchElements(cell.content);
          }
        }
      }
    }
  };
  searchElements(content);
  console.log(tags.filter(t => t.includes('FOTO') || t.includes('DOKUMEN') || t.includes('<')));
}
run();
