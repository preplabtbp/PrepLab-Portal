import { docs } from './google-services.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const docId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI'; // TBP
  const res = await docs.documents.get({ documentId: docId });
  const content = res.data.body?.content || [];
  
  const search = (elements) => {
    for (const el of elements) {
      if (el.paragraph) {
        for (const pel of el.paragraph.elements) {
          if (pel.textRun) {
            const text = pel.textRun.content;
            if (text.includes('FOTO')) {
              console.log("TextRun with FOTO:", JSON.stringify(text));
            }
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
}
run();
