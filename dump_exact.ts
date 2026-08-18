import { docs } from './google-services.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const docId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI';
  const docRes = await docs.documents.get({ documentId: docId });
  const content = docRes.data.body?.content || [];
  
  const searchElements = (elements) => {
    for (const el of elements) {
      if (el.paragraph) {
        let paraText = '';
        for (const pEl of el.paragraph.elements) {
          if (pEl.textRun && pEl.textRun.content) {
            paraText += pEl.textRun.content;
          }
        }
        if (paraText.includes('FOTO')) {
           console.log("Found FOTO in paragraph:", JSON.stringify(paraText));
           console.log("TextRuns:");
           for (const pEl of el.paragraph.elements) {
             if (pEl.textRun) console.log(JSON.stringify(pEl.textRun.content));
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
}
run();
