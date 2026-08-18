import { docs } from './google-services.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const docId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI'; // TBP
  const res = await docs.documents.get({ documentId: docId });
  const content = res.data.body?.content || [];
  
  const tags = [];
  const search = (elements) => {
    for (const el of elements) {
      if (el.paragraph) {
        for (const pel of el.paragraph.elements) {
          if (pel.textRun) {
            tags.push(pel.textRun.content);
          }
        }
      } else if (el.table) {
        for (const row of el.table.tableRows) {
          for (const cell of row.tableCells) {
             if (cell.content) search(cell.content);
          }
        }
      }
    }
  };
  search(content);
  console.log("Found text runs:", tags.filter(t => t.includes('FOTO')));
}
run();
