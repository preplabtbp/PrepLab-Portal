import { drive, docs } from './google-services.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const docId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI'; // TBP
  
  const copyResponse = await drive.files.copy({
    fileId: docId,
    supportsAllDrives: true,
    requestBody: { name: `Temp_test2` },
  });
  const tempDocId = copyResponse.data.id;
  
  await docs.documents.batchUpdate({
    documentId: tempDocId,
    requestBody: {
      requests: [{
        replaceAllText: {
          containsText: { text: '<<FOTOA>>', matchCase: false },
          replaceText: 'TAG_FOTOA',
        }
      }]
    }
  });
  
  const res = await docs.documents.get({ documentId: tempDocId });
  const content = res.data.body?.content || [];
  
  const tags = [];
  const search = (elements) => {
    for (const el of elements) {
      if (el.paragraph) {
        for (const pel of el.paragraph.elements) {
          if (pel.textRun && (pel.textRun.content.includes('FOTOA') || pel.textRun.content.includes('TAG_FOTOA'))) {
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
  console.log("After replaceAllText '<<FOTOA>>':", tags);
}
run();
